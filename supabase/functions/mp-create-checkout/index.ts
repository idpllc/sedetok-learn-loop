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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "No autorizado" }, 401);

    const { plan_code, billing_cycle = "monthly", discount_code, payer_email } = await req.json();
    if (!plan_code) return json({ error: "Falta plan_code" }, 400);
    if (!["monthly", "yearly"].includes(billing_cycle)) {
      return json({ error: "Ciclo inválido" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: plan } = await admin
      .from("subscription_plans")
      .select("*")
      .eq("code", plan_code)
      .maybeSingle();
    if (!plan || plan.code === "free") return json({ error: "Plan inválido" }, 400);

    const baseAmount = billing_cycle === "yearly"
      ? (plan.price_cop_yearly || plan.price_cop * 12)
      : plan.price_cop;
    if (!baseAmount || baseAmount <= 0) return json({ error: "Precio no configurado" }, 400);

    let finalAmount = baseAmount;
    let discountCodeId: string | null = null;
    let discountAmount = 0;

    if (discount_code) {
      const { data: dc } = await admin.rpc("validate_discount_code", {
        _code: discount_code,
        _plan_code: plan_code,
        _billing_cycle: billing_cycle,
        _amount_cop: baseAmount,
      });
      if (!dc || !dc.valid) {
        return json({ error: dc?.error || "Código inválido" }, 400);
      }
      discountCodeId = dc.discount_code_id;
      discountAmount = dc.discount_amount_cop;
      finalAmount = dc.final_amount_cop;
    }

    const email = payer_email || user.email;

    const { data: pendingSub, error: subErr } = await admin
      .from("user_subscriptions")
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        status: "pending",
        mp_payer_email: email,
        billing_cycle,
        discount_code_id: discountCodeId,
        discount_amount_cop: discountAmount,
      })
      .select()
      .single();
    if (subErr) throw subErr;

    const externalRef = pendingSub.id;
    const cycleLabel = billing_cycle === "yearly" ? "Anual" : "Mensual";
    const preferencePayload: any = {
      items: [
        {
          title: `Sedefy ${plan.name} - ${cycleLabel}`,
          description: `Suscripción ${cycleLabel.toLowerCase()} al plan ${plan.name}`,
          quantity: 1,
          currency_id: "COP",
          unit_price: finalAmount,
        },
      ],
      payer: { email },
      external_reference: externalRef,
      notification_url: `${supabaseUrl}/functions/v1/mp-checkout-webhook`,
      back_urls: {
        success: `${customDomain}/pricing?subscription=success`,
        failure: `${customDomain}/pricing?subscription=failure`,
        pending: `${customDomain}/pricing?subscription=pending`,
      },
      auto_return: "approved",
      statement_descriptor: "SEDEFY",
      metadata: {
        subscription_id: pendingSub.id,
        plan_code,
        billing_cycle,
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
    console.log("mp preference:", { status: mpRes.status, id: mpData?.id });

    if (!mpRes.ok || !mpData?.id) {
      await admin.from("user_subscriptions").update({ status: "failed" }).eq("id", pendingSub.id);
      return json({ error: "No se pudo crear el checkout", detail: mpData }, 400);
    }

    const initPoint = mpData.init_point || mpData.sandbox_init_point;
    await admin
      .from("user_subscriptions")
      .update({ mp_preference_id: mpData.id })
      .eq("id", pendingSub.id);

    return json({
      success: true,
      preference_id: mpData.id,
      init_point: initPoint,
      final_amount_cop: finalAmount,
      discount_amount_cop: discountAmount,
    });
  } catch (err) {
    console.error("mp-create-checkout error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
