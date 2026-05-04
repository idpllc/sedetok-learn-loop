import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MP_BASE = "https://api.mercadopago.com";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "No autorizado" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    // Get latest pending or recently created subscription for this user
    const { data: sub } = await admin
      .from("user_subscriptions")
      .select("*, subscription_plans(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) return json({ synced: false, reason: "no_subscription" });
    if (sub.status === "active") {
      return json({ synced: true, status: "active", subscription_id: sub.id });
    }

    // Search payments at MP by external_reference = subscription id
    const searchUrl = `${MP_BASE}/v1/payments/search?external_reference=${encodeURIComponent(sub.id)}&sort=date_created&criteria=desc`;
    const r = await fetch(searchUrl, { headers: { Authorization: `Bearer ${mpToken}` } });
    const data = await r.json();
    const results: any[] = data?.results || [];
    const approved = results.find((p) => ["approved", "accredited"].includes((p.status || "").toLowerCase()));

    if (!approved) {
      const pending = results.find((p) => (p.status || "").toLowerCase() === "in_process" || (p.status || "").toLowerCase() === "pending");
      return json({ synced: false, status: pending ? "pending" : "no_payment", subscription_id: sub.id, payments: results.length });
    }

    // Activate subscription
    const now = new Date();
    const periodEnd = new Date(now);
    if (sub.billing_cycle === "yearly") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Avoid double-insert of payment
    const { data: existingPay } = await admin
      .from("subscription_payments")
      .select("id")
      .eq("provider_transaction_id", String(approved.id))
      .maybeSingle();

    if (!existingPay) {
      await admin.from("subscription_payments").insert({
        user_id: sub.user_id,
        subscription_id: sub.id,
        amount_cop: Math.round(approved.transaction_amount || 0),
        status: "approved",
        reference: String(approved.id),
        provider: "mercadopago",
        provider_transaction_id: String(approved.id),
        raw_response: approved,
        billing_cycle: sub.billing_cycle,
        discount_code_id: sub.discount_code_id,
        discount_amount_cop: sub.discount_amount_cop,
      });
    }

    if (sub.status !== "active") {
      await admin.from("user_subscriptions").update({
        status: "active",
        last_payment_at: now.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        next_billing_at: periodEnd.toISOString(),
        cancel_at_period_end: true,
      }).eq("id", sub.id);

      await admin.rpc("add_monthly_educoins", {
        p_user_id: sub.user_id,
        p_amount: sub.subscription_plans?.monthly_educoins || 0,
        p_reason: `Plan ${sub.subscription_plans?.name} (${sub.billing_cycle})`,
      });

      if (sub.discount_code_id) {
        const { data: existingRedem } = await admin
          .from("discount_code_redemptions")
          .select("id")
          .eq("subscription_id", sub.id)
          .maybeSingle();
        if (!existingRedem) {
          await admin.from("discount_code_redemptions").insert({
            discount_code_id: sub.discount_code_id,
            user_id: sub.user_id,
            subscription_id: sub.id,
            amount_discounted_cop: sub.discount_amount_cop || 0,
          });
          const { data: dc } = await admin
            .from("discount_codes")
            .select("used_count")
            .eq("id", sub.discount_code_id)
            .maybeSingle();
          await admin
            .from("discount_codes")
            .update({ used_count: (dc?.used_count || 0) + 1 })
            .eq("id", sub.discount_code_id);
        }
      }
    }

    return json({ synced: true, status: "active", subscription_id: sub.id, payment_id: approved.id });
  } catch (err) {
    console.error("mp-sync-checkout error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
