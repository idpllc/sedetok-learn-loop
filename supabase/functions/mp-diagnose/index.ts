import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const prefId = url.searchParams.get("pref_id") || "1470641054-3ba78a24-1506-4abd-a472-404d0cbba4c9";
  const token = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;
  const r = await fetch(`https://api.mercadopago.com/checkout/preferences/${prefId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const d = await r.json();
  return new Response(JSON.stringify({ status: r.status, expires: d.expires, preference_expired: d.preference_expired, date_of_expiration: d.date_of_expiration, back_urls: d.back_urls, auto_return: d.auto_return, init_point: d.init_point, error: d.error, message: d.message }, null, 2), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
