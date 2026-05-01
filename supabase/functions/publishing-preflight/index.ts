import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return json({ error: "No autorizado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Configuración de backend incompleta" }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: authData, error: authError } = await admin.auth.getUser(token);

    if (authError || !authData.user) {
      return json({ error: "No autorizado" }, 401);
    }

    const { data: roleData, error: roleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id)
      .eq("role", "superadmin")
      .maybeSingle();

    if (roleError) {
      console.error("Role lookup failed", roleError);
      return json({ error: "No se pudo validar el rol administrador" }, 500);
    }

    if (!roleData) {
      return json({ error: "Solo superadministradores pueden ejecutar esta verificación" }, 403);
    }

    const { data, error } = await admin.rpc("get_user_path_progress_duplicate_preflight");

    if (error) {
      console.error("Publishing preflight failed", error);
      return json({ error: "No se pudo ejecutar la verificación previa", detail: error.message }, 500);
    }

    return json({ ok: true, environment: "Live", result: data });
  } catch (error) {
    console.error("Unexpected publishing preflight error", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return json({ error: "Error inesperado en la verificación previa", detail: message }, 500);
  }
});
