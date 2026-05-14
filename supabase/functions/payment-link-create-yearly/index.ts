import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MP_BASE = "https://api.mercadopago.com";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeBaseUrl = (value?: string) => {
  const cleaned = (value || "https://sedefy.com").trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;
    if (!supabaseUrl || !serviceKey || !mpToken) {
      return json({ error: "Configuración de pagos incompleta" }, 500);
    }
    const customDomain = normalizeBaseUrl(Deno.env.get("CUSTOM_DOMAIN"));

    const { source_subscription_id } = await req.json();
    if (!source_subscription_id) return json({ error: "Falta enlace origen" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    // Load source subscription (publicly accessible via known UUID share link)
    const { data: source, error: srcErr } = await admin
      .from("user_subscriptions")
      .select("id, user_id, plan_id, mp_payer_email, created_by_admin, status")
      .eq("id", source_subscription_id)
      .maybeSingle();
    if (srcErr || !source) return json({ error: "Enlace no encontrado" }, 404);
    if (source.status === "active") return json({ error: "Suscripción ya activa" }, 400);

    const { data: plan } = await admin
      .from("subscription_plans")
      .select("*")
      .eq("id", source.plan_id)
      .maybeSingle();
    if (!plan || plan.code === "free") return json({ error: "Plan inválido" }, 400);

    const yearlyAmount = plan.price_cop_yearly || plan.price_cop * 12;
    if (!yearlyAmount || yearlyAmount <= 0) return json({ error: "Precio anual no configurado" }, 400);

    const email = source.mp_payer_email;
    if (!email) return json({ error: "Sin correo del beneficiario" }, 400);

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, username")
      .eq("id", source.user_id)
      .maybeSingle();

    const { data: pendingSub, error: subErr } = await admin
      .from("user_subscriptions")
      .insert({
        user_id: source.user_id,
        plan_id: plan.id,
        status: "pending",
        mp_payer_email: email,
        billing_cycle: "yearly",
        amount_cop: yearlyAmount,
        plan_code_snapshot: plan.code,
        created_by_admin: source.created_by_admin,
      })
      .select()
      .single();
    if (subErr) throw subErr;

    const externalRef = pendingSub.id;
    const preferencePayload: any = {
      items: [{
        title: `Sedefy ${plan.name} - Anual`,
        description: `Suscripción anual al plan ${plan.name}`,
        quantity: 1,
        currency_id: "COP",
        unit_price: yearlyAmount,
      }],
      payer: { email },
      external_reference: externalRef,
      notification_url: `${supabaseUrl}/functions/v1/mp-checkout-webhook`,
      back_urls: {
        success: `${customDomain}/pay/${externalRef}?status=success`,
        failure: `${customDomain}/pay/${externalRef}?status=failure`,
        pending: `${customDomain}/pay/${externalRef}?status=pending`,
      },
      auto_return: "approved",
      statement_descriptor: "SEDEFY",
      metadata: {
        subscription_id: pendingSub.id,
        plan_code: plan.code,
        billing_cycle: "yearly",
        beneficiary_user_id: source.user_id,
      },
    };

    const mpRes = await fetch(`${MP_BASE}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencePayload),
    });
    const mpData = await mpRes.json();

    if (!mpRes.ok || !mpData?.id) {
      await admin.from("user_subscriptions").update({ status: "failed" }).eq("id", pendingSub.id);
      return json({ error: "No se pudo crear el checkout", detail: mpData }, 400);
    }

    const initPoint = mpData.init_point || mpData.sandbox_init_point;
    await admin
      .from("user_subscriptions")
      .update({ mp_preference_id: mpData.id, mp_init_point: initPoint })
      .eq("id", pendingSub.id);

    return json({
      success: true,
      subscription_id: pendingSub.id,
      init_point: initPoint,
      amount_cop: yearlyAmount,
      beneficiary_name: profile?.full_name || profile?.username || email,
    });
  } catch (err) {
    console.error("payment-link-create-yearly error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
