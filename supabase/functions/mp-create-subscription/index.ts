import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MP_BASE = "https://api.mercadopago.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;
    const customDomain = Deno.env.get("CUSTOM_DOMAIN") || "https://sedefy.com";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { plan_code, payer_email } = await req.json();
    if (!plan_code) {
      return new Response(JSON.stringify({ error: "Falta plan_code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: plan } = await admin.from("subscription_plans").select("*").eq("code", plan_code).maybeSingle();
    if (!plan || plan.code === "free") {
      return new Response(JSON.stringify({ error: "Plan inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const email = payer_email || user.email;

    // Create a pending subscription record so we can correlate the webhook
    const { data: pendingSub, error: subErr } = await admin.from("user_subscriptions").insert({
      user_id: user.id,
      plan_id: plan.id,
      status: "pending",
      mp_payer_email: email,
    }).select().single();
    if (subErr) throw subErr;

    // Build preapproval payload
    const externalRef = pendingSub.id; // we'll match by this in the webhook
    const preapprovalPayload = {
      reason: `Sedefy ${plan.name}`,
      external_reference: externalRef,
      payer_email: email,
      back_url: `${customDomain}/pricing?subscription=success`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: plan.price_cop,
        currency_id: "COP",
      },
      status: "pending",
      notification_url: `${supabaseUrl}/functions/v1/mp-subscription-webhook`,
    };

    const mpRes = await fetch(`${MP_BASE}/preapproval`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preapprovalPayload),
    });
    const mpData = await mpRes.json();
    console.log("mp preapproval:", mpData);

    if (!mpRes.ok || !mpData?.id) {
      await admin.from("user_subscriptions").update({ status: "failed" }).eq("id", pendingSub.id);
      return new Response(JSON.stringify({ error: "No se pudo crear la suscripción", detail: mpData }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("user_subscriptions").update({
      mp_preapproval_id: mpData.id,
    }).eq("id", pendingSub.id);

    return new Response(JSON.stringify({
      success: true,
      preapproval_id: mpData.id,
      init_point: mpData.init_point,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("mp-create-subscription error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
