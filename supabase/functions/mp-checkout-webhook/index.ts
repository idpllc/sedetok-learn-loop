import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyPlanPurchase, runInBackground } from "../_shared/plan-purchase-notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MP_BASE = "https://api.mercadopago.com";

const hostOf = (value: string) => {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};

const hmacHex = async (secret: string, message: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

/** Strict x-signature verification (used by the /pagar checkout-orders flow). */
const verifyMpSignature = async (req: Request, url: URL, secret: string, fallbackId: string): Promise<boolean> => {
  try {
    const xSignature = req.headers.get("x-signature") || "";
    const xRequestId = req.headers.get("x-request-id") || "";
    const dataId = (url.searchParams.get("data.id") || url.searchParams.get("id") || fallbackId || "").toString().toLowerCase();
    const parts = Object.fromEntries(
      xSignature.split(",").map((p) => {
        const [k, ...v] = p.trim().split("=");
        return [k, v.join("=")];
      })
    ) as Record<string, string>;
    if (!parts.ts || !parts.v1) return false;
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${parts.ts};`;
    const computed = await hmacHex(secret, manifest);
    return computed === parts.v1;
  } catch {
    return false;
  }
};

const relayEventFor = (s: string) =>
  s === "approved" ? "payment.approved"
    : s === "pending" || s === "in_process" ? "payment.pending"
    : s === "rejected" ? "payment.rejected"
    : s === "cancelled" ? "payment.cancelled"
    : "payment.refunded"; // refunded, charged_back

/**
 * /pagar flow: a payment whose external_reference is a checkout_orders row.
 * Updates the order and relays every status change to the school, signed
 * with that school's webhook secret. Responds 200 only when the school
 * answered 200 so MercadoPago retries otherwise.
 */
const handleCheckoutOrder = async (
  supabase: any,
  req: Request,
  url: URL,
  webhookSecret: string | undefined,
  payment: any,
  order: any,
) => {
  if (webhookSecret) {
    const ok = await verifyMpSignature(req, url, webhookSecret, String(payment?.id || ""));
    if (!ok) {
      console.warn("mp-checkout-webhook: invalid signature for checkout order", { id: payment?.id });
      return new Response(JSON.stringify({ error: "invalid signature" }), { status: 401, headers: corsHeaders });
    }
  }

  const status = String(payment.status || "").toLowerCase();
  const mpPaymentId = String(payment.id || "");

  await supabase.from("checkout_orders").update({
    status,
    mp_payment_id: mpPaymentId,
    updated_at: new Date().toISOString(),
  }).eq("id", order.id);

  // Notify admins on the first approval of a school plan purchase.
  if (status === "approved" && String(order.status || "").toLowerCase() !== "approved") {
    runInBackground(notifyPlanPurchase(supabase, {
      kind: "paid",
      source: `Colegio: ${order.school_name || order.school_origin}`,
      planName: `Pedido #${order.school_order_id}`,
      buyerEmail: order.payer_email,
      amountCop: order.amount,
    }));
  }

  // Idempotency: this payment+status already delivered → 200 without resending
  const { data: relay } = await supabase
    .from("payment_relays")
    .select("*")
    .eq("mp_payment_id", mpPaymentId)
    .eq("status", status)
    .maybeSingle();
  if (relay?.delivered_at) {
    return new Response(JSON.stringify({ ok: true, note: "already delivered" }), { headers: corsHeaders });
  }

  const { data: school } = await supabase
    .from("school_endpoints")
    .select("origin, webhook_secret")
    .eq("origin", order.school_origin)
    .maybeSingle();

  let delivered = false;
  let lastError: string | null = null;

  if (!school) {
    lastError = "school endpoint not configured";
    console.error("mp-checkout-webhook: school endpoint not found for a checkout order");
  } else {
    const payload = {
      event: relayEventFor(status),
      status,
      order_id: order.school_order_id,
      payment_id: mpPaymentId,
      amount: Math.round(payment.transaction_amount || 0),
      currency: "COP",
      status_detail: payment.status_detail || null,
      payment_method: payment.payment_method_id || null,
      payment_type: payment.payment_type_id || null,
      live_mode: Boolean(payment.live_mode),
      paid_at: payment.date_approved || null,
      provider: "mercadopago",
    };
    const body = JSON.stringify(payload); // sign the exact text we send
    try {
      const signature = await hmacHex(school.webhook_secret, body);
      const res = await fetch(`${school.origin}/api/sedefy-pago`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-sedefy-signature": signature },
        body,
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        delivered = true;
        const result = await res.json().catch(() => ({}));
        if (result?.status === "error") {
          console.error("mp-checkout-webhook: school reported relay result 'error'", { mpPaymentId, status });
        }
      } else {
        lastError = res.status === 401
          ? "school returned 401 (webhook secret mismatch)"
          : `school responded HTTP ${res.status}`;
        console.error("mp-checkout-webhook: relay failed", { mpPaymentId, status, schoolStatus: res.status });
      }
    } catch (err) {
      lastError = (err as Error).message;
      console.error("mp-checkout-webhook: relay exception", lastError);
    }
  }

  if (relay) {
    await supabase.from("payment_relays").update({
      attempts: (relay.attempts || 0) + 1,
      last_error: delivered ? null : lastError,
      delivered_at: delivered ? new Date().toISOString() : null,
    }).eq("id", relay.id);
  } else {
    await supabase.from("payment_relays").insert({
      checkout_order_id: order.id,
      mp_payment_id: mpPaymentId,
      status,
      attempts: 1,
      last_error: delivered ? null : lastError,
      delivered_at: delivered ? new Date().toISOString() : null,
    });
  }

  if (!delivered) {
    return new Response(JSON.stringify({ error: "relay failed" }), { status: 500, headers: corsHeaders });
  }
  return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
};

/**
 * Sends an approved-payment notification to the school's own website.
 * The target site is resolved from the origin the buyer came from
 * (user_subscriptions.return_origin) matched against institution_domains.
 */
const notifySchool = async (supabase: any, sub: any, payment: any) => {
  const host = hostOf(sub.return_origin || "");
  if (!host) return;

  const { data: domains } = await supabase
    .from("institution_domains")
    .select("domain, webhook_url, webhook_secret, is_active, id")
    .eq("is_active", true)
    .not("webhook_url", "is", null);

  const target = (domains || []).find((d: any) => hostOf(String(d.domain)) === host);
  if (!target?.webhook_url) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, numero_documento, email, full_name, username, educoins")
    .eq("id", sub.user_id)
    .maybeSingle();

  const payload = {
    event: "payment.approved",
    sent_at: new Date().toISOString(),
    user: {
      id: sub.user_id,
      numero_documento: profile?.numero_documento || null,
      email: profile?.email || null,
      full_name: profile?.full_name || null,
      username: profile?.username || null,
    },
    subscription: {
      id: sub.id,
      plan_code: sub.subscription_plans?.code || null,
      plan_name: sub.subscription_plans?.name || null,
      billing_cycle: sub.billing_cycle,
      current_period_end: sub.current_period_end || null,
    },
    credits: {
      granted: sub.subscription_plans?.monthly_educoins || 0,
      balance: profile?.educoins ?? null,
    },
    payment: {
      id: String(payment?.id || ""),
      amount_cop: Math.round(payment?.transaction_amount || 0),
      status: "approved",
      provider: "mercadopago",
    },
  };

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (target.webhook_secret) {
    headers["x-sedefy-signature"] = await hmacHex(target.webhook_secret, body);
  }

  let statusText = "";
  try {
    const res = await fetch(target.webhook_url, { method: "POST", headers, body });
    statusText = `${res.status}`;
  } catch (err) {
    statusText = `error: ${(err as Error).message}`;
  }

  await supabase
    .from("institution_domains")
    .update({ last_webhook_at: new Date().toISOString(), last_webhook_status: statusText })
    .eq("id", target.id);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;
    const webhookSecret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");

    const url = new URL(req.url);
    let topic = url.searchParams.get("topic") || url.searchParams.get("type") || "";
    let id = url.searchParams.get("id") || url.searchParams.get("data.id") || "";

    // Signature verification (log-only; never reject to avoid missing legitimate payments)
    if (webhookSecret) {
      try {
        const xSignature = req.headers.get("x-signature") || "";
        const xRequestId = req.headers.get("x-request-id") || "";
        const dataId = (url.searchParams.get("data.id") || id || "").toString().toLowerCase();
        const parts = Object.fromEntries(
          xSignature.split(",").map((p) => {
            const [k, ...v] = p.trim().split("=");
            return [k, v.join("=")];
          })
        ) as Record<string, string>;
        const ts = parts.ts;
        const v1 = parts.v1;
        if (ts && v1) {
          const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
          const key = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(webhookSecret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
          );
          const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
          const computed = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
          if (computed !== v1) {
            console.warn("mp-checkout-webhook signature mismatch (continuing, will verify payment via MP API)", { dataId, xRequestId });
          }
        }
      } catch (sigErr) {
        console.warn("mp-checkout-webhook signature check error (continuing):", sigErr);
      }
    }


    let body: any = {};
    if (req.headers.get("content-type")?.includes("application/json")) {
      try { body = await req.json(); } catch (_) {}
    }
    topic = topic || body.topic || body.type || "";
    id = id || body.data?.id || body.id || "";

    console.log("mp-checkout-webhook:", { topic, id, url: req.url });

    if (topic !== "payment" && topic !== "merchant_order") {
      console.log("mp-checkout-webhook: ignored topic", topic);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (!id) return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });

    let payment: any = null;
    if (topic === "payment") {
      const r = await fetch(`${MP_BASE}/v1/payments/${id}`, { headers: { Authorization: `Bearer ${mpToken}` } });
      payment = await r.json();
    } else {
      const r = await fetch(`${MP_BASE}/merchant_orders/${id}`, { headers: { Authorization: `Bearer ${mpToken}` } });
      const mo = await r.json();
      const approved = (mo.payments || []).find((p: any) => p.status === "approved");
      if (!approved) {
        console.log("mp-checkout-webhook: merchant_order without approved payment", { id });
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
      const r2 = await fetch(`${MP_BASE}/v1/payments/${approved.id}`, { headers: { Authorization: `Bearer ${mpToken}` } });
      payment = await r2.json();
    }

    console.log("mp-checkout-webhook: payment fetched", { id: payment?.id, status: payment?.status, external_reference: payment?.external_reference });

    const externalRef = payment.external_reference;
    if (!externalRef) {
      console.warn("mp-checkout-webhook: no external_reference", payment);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // /pagar flow: external_reference may be a checkout_orders row
    const { data: checkoutOrder } = await supabase
      .from("checkout_orders")
      .select("*")
      .eq("id", externalRef)
      .maybeSingle();
    if (checkoutOrder) {
      return await handleCheckoutOrder(supabase, req, url, webhookSecret, payment, checkoutOrder);
    }

    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("*, subscription_plans(*)")
      .eq("id", externalRef)
      .maybeSingle();
    if (!sub) {
      console.warn("mp-checkout-webhook: subscription not found", externalRef);
      return new Response(JSON.stringify({ ok: true, note: "sub not found" }), { headers: corsHeaders });
    }


    const status = (payment.status || "").toLowerCase();
    const approved = status === "approved" || status === "accredited";
    const amount = Math.round(payment.transaction_amount || 0);

    // MercadoPago can deliver the same payment twice (payment + merchant_order
    // topics); used to avoid duplicate admin emails.
    const { data: existingPayment } = await supabase
      .from("subscription_payments")
      .select("id")
      .eq("provider", "mercadopago")
      .eq("provider_transaction_id", String(payment.id || ""))
      .maybeSingle();

    if (!existingPayment) {
      await supabase.from("subscription_payments").insert({
        user_id: sub.user_id,
        subscription_id: sub.id,
        amount_cop: amount,
        status: approved ? "approved" : status,
        reference: String(payment.id || ""),
        provider: "mercadopago",
        provider_transaction_id: String(payment.id || ""),
        raw_response: payment,
        billing_cycle: sub.billing_cycle,
        discount_code_id: sub.discount_code_id,
        discount_amount_cop: sub.discount_amount_cop,
      });
    } else {
      console.log("mp-checkout-webhook: payment already recorded, skipping insert", payment.id);
    }

    if (approved) {
      const now = new Date();
      const periodEnd = new Date(now);
      if (sub.billing_cycle === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      await supabase.from("user_subscriptions").update({
        status: "active",
        last_payment_at: now.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        next_billing_at: periodEnd.toISOString(),
        cancel_at_period_end: true, // checkout = one-time, won't auto-renew
      }).eq("id", sub.id);

      await supabase.rpc("add_monthly_educoins", {
        p_user_id: sub.user_id,
        p_amount: sub.subscription_plans?.monthly_educoins || 0,
        p_reason: `Plan ${sub.subscription_plans?.name} (${sub.billing_cycle})`,
      });

      if (sub.discount_code_id) {
        await supabase.from("discount_code_redemptions").insert({
          discount_code_id: sub.discount_code_id,
          user_id: sub.user_id,
          subscription_id: sub.id,
          amount_discounted_cop: sub.discount_amount_cop || 0,
        });
        // bump used_count
        const { data: dc } = await supabase
          .from("discount_codes")
          .select("used_count")
          .eq("id", sub.discount_code_id)
          .maybeSingle();
        await supabase
          .from("discount_codes")
          .update({ used_count: (dc?.used_count || 0) + 1 })
          .eq("id", sub.discount_code_id);
      }

      // Notify the school's own website (webhook) so it can refresh the teacher's credits there.
      try {
        await notifySchool(supabase, sub, payment);
      } catch (notifyErr) {
        console.warn("mp-checkout-webhook: school notify failed", notifyErr);
      }

      // Notify admins: a plan was actually paid (only on first delivery of this payment).
      if (!existingPayment) {
        runInBackground(notifyPlanPurchase(supabase, {
          kind: "paid",
          source: "Sedefy",
          planName: sub.subscription_plans?.name || "Plan Sedefy",
          buyerEmail: sub.mp_payer_email,
          billingCycle: sub.billing_cycle === "yearly" ? "Anual" : "Mensual",
          amountCop: amount,
        }));
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (err) {
    console.error("mp-checkout-webhook err:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
