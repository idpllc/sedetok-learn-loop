import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Daily cron: expire subscriptions whose period has ended and were marked to cancel.
// ePayco itself triggers recurring charges and posts to /epayco-confirmation, which
// extends current_period_end. This cron only expires the ones that should drop to free.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date().toISOString();

    const { data: expired } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("status", "active")
      .lt("current_period_end", now)
      .or("cancel_at_period_end.eq.true");

    if (expired && expired.length > 0) {
      await supabase.from("user_subscriptions")
        .update({ status: "expired" })
        .in("id", expired.map((s) => s.id));
    }

    return new Response(JSON.stringify({ ok: true, expired: expired?.length || 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
