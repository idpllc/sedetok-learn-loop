import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MP_BASE = "https://api.mercadopago.com";

/**
 * MercadoPago notifies on:
 *  - topic=preapproval (status changes: pending/authorized/paused/cancelled)
 *  - topic=authorized_payment (each recurring charge)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

    const url = new URL(req.url);
    let topic = url.searchParams.get("topic") || url.searchParams.get("type") || "";
    let id = url.searchParams.get("id") || url.searchParams.get("data.id") || "";

    let body: any = {};
    if (req.headers.get("content-type")?.includes("application/json")) {
      try { body = await req.json(); } catch (_) { body = {}; }
    }
    topic = topic || body.topic || body.type || "";
    id = id || body.data?.id || body.id || "";

    console.log("mp-webhook:", { topic, id, body });

    if (!topic || !id) {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (topic === "preapproval" || topic === "subscription_preapproval") {
      const res = await fetch(`${MP_BASE}/preapproval/${id}`, {
        headers: { Authorization: `Bearer ${mpToken}` },
      });
      const pre = await res.json();
      console.log("preapproval detail:", pre);

      const { data: sub } = await supabase.from("user_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("mp_preapproval_id", id)
        .maybeSingle();
      if (!sub) {
        return new Response(JSON.stringify({ ok: true, note: "subscription not found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let newStatus = sub.status;
      const mpStatus = (pre.status || "").toLowerCase();
      if (mpStatus === "authorized") newStatus = "active";
      else if (mpStatus === "paused") newStatus = "paused";
      else if (mpStatus === "cancelled") newStatus = "cancelled";
      else if (mpStatus === "pending") newStatus = "pending";

      await supabase.from("user_subscriptions").update({
        status: newStatus,
        cancelled_at: mpStatus === "cancelled" ? new Date().toISOString() : sub.cancelled_at,
      }).eq("id", sub.id);

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (topic === "authorized_payment" || topic === "subscription_authorized_payment") {
      const res = await fetch(`${MP_BASE}/authorized_payments/${id}`, {
        headers: { Authorization: `Bearer ${mpToken}` },
      });
      const pay = await res.json();
      console.log("authorized_payment detail:", pay);

      const preapprovalId = pay.preapproval_id;
      if (!preapprovalId) {
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: sub } = await supabase.from("user_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("mp_preapproval_id", preapprovalId)
        .maybeSingle();
      if (!sub) {
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const status = (pay.status || "").toLowerCase();
      const approved = status === "approved" || status === "accredited";
      const amount = Math.round(pay.transaction_amount || sub.subscription_plans?.price_cop || 0);

      await supabase.from("subscription_payments").insert({
        user_id: sub.user_id,
        subscription_id: sub.id,
        amount_cop: amount,
        status: approved ? "approved" : "rejected",
        reference: String(pay.id || ""),
        provider: "mercadopago",
        provider_transaction_id: String(pay.id || ""),
        raw_response: pay,
      });

      if (approved) {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await supabase.from("user_subscriptions").update({
          status: "active",
          last_payment_at: now.toISOString(),
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          next_billing_at: periodEnd.toISOString(),
        }).eq("id", sub.id);

        await supabase.rpc("add_monthly_educoins", {
          p_user_id: sub.user_id,
          p_amount: sub.subscription_plans?.monthly_educoins || 0,
          p_reason: `Plan ${sub.subscription_plans?.name}`,
        });
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("mp-webhook err:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
