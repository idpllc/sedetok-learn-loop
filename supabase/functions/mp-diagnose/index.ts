import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  if (!mpToken) return new Response(JSON.stringify({ error: "no token" }), { status: 500, headers: corsHeaders });

  const payload = {
    items: [{
      title: "Test Sedefy",
      description: "test",
      quantity: 1,
      currency_id: "COP",
      unit_price: 10000,
    }],
    payer: { email: "test@test.com" },
    external_reference: "diagnose-" + Date.now(),
    notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-checkout-webhook`,
    back_urls: {
      success: `https://sedefy.com/pricing?subscription=success`,
      failure: `https://sedefy.com/pricing?subscription=failure`,
      pending: `https://sedefy.com/pricing?subscription=pending`,
    },
    auto_return: "approved",
    statement_descriptor: "SEDEFY",
  };

  const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { Authorization: `Bearer ${mpToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await r.json();
  return new Response(JSON.stringify({ status: r.status, data }, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
