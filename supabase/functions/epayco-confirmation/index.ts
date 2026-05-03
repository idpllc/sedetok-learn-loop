import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let body: any = {};
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) body = await req.json();
    else {
      const form = await req.formData();
      form.forEach((v, k) => { body[k] = v.toString(); });
    }
    console.log("epayco-confirmation:", body);

    const refPayco = body.x_ref_payco || body.ref_payco;
    const status = (body.x_transaction_state || body.x_response || "").toLowerCase();
    const customerId = body.x_customer_id || body.customer_id;
    const subscriptionId = body.x_id_invoice || body.id_subscription;
    const amount = parseInt(body.x_amount || body.amount || "0", 10);

    if (!customerId && !subscriptionId) {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Locate subscription by epayco ids
    let { data: sub } = await supabase.from("user_subscriptions")
      .select("*, subscription_plans(*)")
      .or(`epayco_customer_id.eq.${customerId},epayco_subscription_id.eq.${subscriptionId}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) {
      return new Response(JSON.stringify({ ok: true, note: "subscription not found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const approved = status.includes("acept") || status === "1";

    await supabase.from("subscription_payments").insert({
      user_id: sub.user_id,
      subscription_id: sub.id,
      amount_cop: amount || sub.subscription_plans?.price_cop || 0,
      status: approved ? "approved" : "rejected",
      reference: String(refPayco || ""),
      provider: "epayco",
      provider_transaction_id: String(refPayco || ""),
      raw_response: body,
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
        p_reason: `Renovación plan ${sub.subscription_plans?.name}`,
      });
    } else {
      await supabase.from("user_subscriptions").update({ status: "failed" }).eq("id", sub.id);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("confirmation err:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
