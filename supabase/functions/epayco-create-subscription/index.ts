import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EPAYCO_BASE = "https://api.secure.payco.co";

async function epaycoLogin(publicKey: string, privateKey: string) {
  const auth = btoa(`${publicKey}:${privateKey}`);
  const res = await fetch(`${EPAYCO_BASE}/v1/auth/login`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`epayco login failed: ${res.status}`);
  const data = await res.json();
  return data.token as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const publicKey = Deno.env.get("EPAYCO_PUBLIC_KEY")!;
    const privateKey = Deno.env.get("EPAYCO_PRIVATE_KEY")!;
    const pCustId = Deno.env.get("EPAYCO_P_CUST_ID_CLIENTE")!;
    const pKey = Deno.env.get("EPAYCO_P_KEY")!;

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

    const body = await req.json();
    const { plan_code, token_card, card_holder, card_email, card_phone, doc_type, doc_number, address, city } = body;

    if (!plan_code || !token_card) {
      return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: plan } = await admin.from("subscription_plans").select("*").eq("code", plan_code).maybeSingle();
    if (!plan || plan.code === "free") {
      return new Response(JSON.stringify({ error: "Plan inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiToken = await epaycoLogin(publicKey, privateKey);
    const headersJson = { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" };

    // 1) Create customer
    const { data: profile } = await admin.from("profiles").select("full_name, username").eq("id", user.id).maybeSingle();
    const [firstName, ...rest] = (card_holder || profile?.full_name || profile?.username || "Usuario").split(" ");
    const lastName = rest.join(" ") || ".";

    const customerPayload = {
      token_card,
      name: firstName,
      last_name: lastName,
      email: card_email || user.email,
      default: true,
      city: city || "Bogota",
      address: address || "N/A",
      phone: card_phone || "0000000000",
      cell_phone: card_phone || "0000000000",
    };

    const customerRes = await fetch(`${EPAYCO_BASE}/payment/v1/customer/create`, {
      method: "POST",
      headers: headersJson,
      body: JSON.stringify(customerPayload),
    });
    const customerData = await customerRes.json();
    console.log("epayco customer:", customerData);
    if (!customerData?.status) {
      return new Response(JSON.stringify({ error: "No se pudo crear cliente", detail: customerData }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const customerId = customerData.data?.customerId;

    // 2) Create subscription plan in ePayco if not exists (idempotent on plan code)
    const planEpayId = `sedefy_${plan.code}_${plan.price_cop}`;
    const planPayload = {
      id_plan: planEpayId,
      name: `Sedefy ${plan.name}`,
      description: `Plan ${plan.name} de Sedefy`,
      amount: plan.price_cop,
      currency: "cop",
      interval: "month",
      interval_count: 1,
      trial_days: 0,
    };
    await fetch(`${EPAYCO_BASE}/recurring/v1/plan/create`, {
      method: "POST",
      headers: headersJson,
      body: JSON.stringify(planPayload),
    }).then((r) => r.json()).then((d) => console.log("plan:", d)).catch((e) => console.log("plan err:", e));

    // 3) Create subscription
    const subPayload = {
      id_plan: planEpayId,
      customer: customerId,
      token_card,
      doc_type: doc_type || "CC",
      doc_number: doc_number || "0",
      url_confirmation: `${supabaseUrl}/functions/v1/epayco-confirmation`,
      method_confirmation: "POST",
    };
    const subRes = await fetch(`${EPAYCO_BASE}/recurring/v1/subscription/create`, {
      method: "POST",
      headers: headersJson,
      body: JSON.stringify(subPayload),
    });
    const subData = await subRes.json();
    console.log("epayco subscription:", subData);

    // 4) Charge subscription (first payment)
    const chargePayload = {
      id_plan: planEpayId,
      customer: customerId,
      token_card,
      doc_type: doc_type || "CC",
      doc_number: doc_number || "0",
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      url_confirmation: `${supabaseUrl}/functions/v1/epayco-confirmation`,
      method_confirmation: "POST",
    };
    const chargeRes = await fetch(`${EPAYCO_BASE}/payment/process/subscription`, {
      method: "POST",
      headers: headersJson,
      body: JSON.stringify(chargePayload),
    });
    const chargeData = await chargeRes.json();
    console.log("epayco charge:", chargeData);

    const approved = chargeData?.data?.status === "Aceptada" || chargeData?.success === true;
    const reference = chargeData?.data?.ref_payco || chargeData?.data?.x_ref_payco || crypto.randomUUID();

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Cancel any existing active sub for this user
    await admin.from("user_subscriptions").update({ status: "cancelled", cancelled_at: now.toISOString() })
      .eq("user_id", user.id).eq("status", "active");

    const { data: insertedSub } = await admin.from("user_subscriptions").insert({
      user_id: user.id,
      plan_id: plan.id,
      status: approved ? "active" : "pending",
      current_period_start: approved ? now.toISOString() : null,
      current_period_end: approved ? periodEnd.toISOString() : null,
      next_billing_at: approved ? periodEnd.toISOString() : null,
      last_payment_at: approved ? now.toISOString() : null,
      epayco_customer_id: customerId,
      epayco_subscription_id: subData?.data?.id_subscription || null,
      epayco_token_card: token_card,
    }).select().single();

    await admin.from("subscription_payments").insert({
      user_id: user.id,
      subscription_id: insertedSub?.id,
      amount_cop: plan.price_cop,
      status: approved ? "approved" : "pending",
      reference: String(reference),
      provider: "epayco",
      provider_transaction_id: String(reference),
      raw_response: chargeData,
    });

    if (approved) {
      await admin.rpc("add_monthly_educoins", {
        p_user_id: user.id,
        p_amount: plan.monthly_educoins,
        p_reason: `Educoins del plan ${plan.name}`,
      });
    }

    return new Response(JSON.stringify({
      success: approved,
      status: approved ? "active" : "pending",
      message: approved ? "Suscripción activada" : "Pago pendiente",
      detail: chargeData?.data || null,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("epayco-create-subscription error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
