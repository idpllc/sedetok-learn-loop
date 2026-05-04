import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MP_BASE = "https://api.mercadopago.com";

const defaultPlans = [
  { code: "free", name: "Free", price_cop: 0, monthly_educoins: 20, max_notebooks: 1, max_sources_per_notebook: 3, voice_chat_access: false, read_aloud_access: false, premium_courses_access: false, is_active: true, sort_order: 1 },
  { code: "premium", name: "Premium", price_cop: 14900, monthly_educoins: 100, max_notebooks: 20, max_sources_per_notebook: 50, voice_chat_access: true, read_aloud_access: true, premium_courses_access: false, is_active: true, sort_order: 2 },
  { code: "ultra", name: "Ultra", price_cop: 29500, monthly_educoins: 300, max_notebooks: null, max_sources_per_notebook: null, voice_chat_access: true, read_aloud_access: true, premium_courses_access: true, is_active: true, sort_order: 3 },
];

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeBaseUrl = (value?: string) => {
  const cleaned = (value || "https://sedefy.com").trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
};

const ensureDefaultPlans = async (admin: ReturnType<typeof createClient>) => {
  const { error } = await admin
    .from("subscription_plans")
    .upsert(defaultPlans, { onConflict: "code" });

  if (error) {
    console.error("Failed to ensure subscription plans:", error.message);
    throw new Error("No se pudieron preparar los planes de suscripción");
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    const missingEnv = [
      ["SUPABASE_URL", supabaseUrl],
      ["SUPABASE_SERVICE_ROLE_KEY", serviceKey],
      ["MERCADOPAGO_ACCESS_TOKEN", mpToken],
    ].filter(([, value]) => !value).map(([name]) => name);

    if (missingEnv.length > 0) {
      console.error("Missing subscription environment variables:", missingEnv.join(", "));
      return jsonResponse({ error: "Configuración de pagos incompleta", missing: missingEnv }, 500);
    }

    const customDomain = normalizeBaseUrl(Deno.env.get("CUSTOM_DOMAIN"));

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "No autorizado" }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return jsonResponse({ error: "No autorizado" }, 401);
    }

    const { plan_code, payer_email } = await req.json();
    if (!plan_code) {
      return jsonResponse({ error: "Falta plan_code" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    await ensureDefaultPlans(admin);

    const { data: plan } = await admin.from("subscription_plans").select("*").eq("code", plan_code).maybeSingle();
    if (!plan || plan.code === "free") {
      return jsonResponse({ error: "Plan inválido" }, 400);
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
    const mpRaw = await mpRes.text();
    let mpData: any = null;
    try {
      mpData = mpRaw ? JSON.parse(mpRaw) : null;
    } catch {
      mpData = { raw: mpRaw };
    }
    console.log("mp preapproval:", {
      status: mpRes.status,
      has_id: Boolean(mpData?.id),
      message: mpData?.message || mpData?.error || null,
    });

    if (!mpRes.ok || !mpData?.id) {
      await admin.from("user_subscriptions").update({ status: "failed" }).eq("id", pendingSub.id);
      return jsonResponse({ error: "No se pudo crear la suscripción", detail: mpData }, 400);
    }

    const initPoint = mpData.init_point || mpData.sandbox_init_point;
    if (!initPoint) {
      await admin.from("user_subscriptions").update({ status: "failed" }).eq("id", pendingSub.id);
      return jsonResponse({ error: "Mercado Pago no devolvió un enlace de pago", detail: mpData }, 400);
    }

    await admin.from("user_subscriptions").update({
      mp_preapproval_id: mpData.id,
    }).eq("id", pendingSub.id);

    return jsonResponse({
      success: true,
      preapproval_id: mpData.id,
      init_point: initPoint,
    });
  } catch (err) {
    console.error("mp-create-subscription error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
