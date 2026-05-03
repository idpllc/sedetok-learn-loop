import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(supabaseUrl, serviceKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: sub } = await admin.from("user_subscriptions").select("*").eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (!sub) return new Response(JSON.stringify({ error: "Sin suscripción activa" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Mark cancel at period end (keeps benefits until current_period_end)
    await admin.from("user_subscriptions").update({
      cancel_at_period_end: true,
      cancelled_at: new Date().toISOString(),
    }).eq("id", sub.id);

    // Try to cancel in ePayco (best effort)
    try {
      const publicKey = Deno.env.get("EPAYCO_PUBLIC_KEY")!;
      const privateKey = Deno.env.get("EPAYCO_PRIVATE_KEY")!;
      const auth = btoa(`${publicKey}:${privateKey}`);
      const loginRes = await fetch(`https://api.secure.payco.co/v1/auth/login`, { method: "POST", headers: { Authorization: `Basic ${auth}` } });
      const { token } = await loginRes.json();
      if (sub.epayco_subscription_id) {
        await fetch(`https://api.secure.payco.co/recurring/v1/subscription/cancel/${sub.epayco_subscription_id}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (e) {
      console.log("epayco cancel best-effort failed:", e);
    }

    return new Response(JSON.stringify({ ok: true, message: "Suscripción cancelada al final del ciclo" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
