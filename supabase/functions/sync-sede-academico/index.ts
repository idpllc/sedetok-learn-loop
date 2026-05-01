import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-key",
};

// Block obviously dangerous hostnames (SSRF protection).
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "0.0.0.0") return true;
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;
  // Cloud metadata endpoints
  if (h === "169.254.169.254" || h === "metadata.google.internal") return true;
  // IPv4 private/loopback ranges
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  // IPv6 loopback / link-local / unique-local
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  return false;
}

function validateApiUrl(input: unknown): URL {
  if (typeof input !== "string" || input.length === 0 || input.length > 2048) {
    throw new Error("apiUrl es requerido y debe ser una cadena válida");
  }
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error("apiUrl no es una URL válida");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Solo se permiten URLs HTTPS");
  }
  if (isBlockedHost(parsed.hostname)) {
    throw new Error("Host no permitido");
  }
  // Optional allowlist via env var (comma-separated hostnames)
  const allowlistEnv = Deno.env.get("ALLOWED_SYNC_HOSTS");
  if (allowlistEnv && allowlistEnv.trim().length > 0) {
    const allowed = allowlistEnv.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes(parsed.hostname.toLowerCase())) {
      throw new Error("Host no está en la lista permitida");
    }
  }
  return parsed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require shared webhook key so only trusted callers can trigger syncs.
    const expectedKey = Deno.env.get("WEBHOOK_API_KEY");
    const providedKey = req.headers.get("x-webhook-key") ?? req.headers.get("x-api-key");
    if (!expectedKey || providedKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { institutionId, apiUrl } = body ?? {};

    if (!institutionId || typeof institutionId !== "string") {
      throw new Error("institutionId es requerido");
    }
    // Basic UUID validation
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(institutionId)) {
      throw new Error("institutionId no es un UUID válido");
    }

    const validatedUrl = validateApiUrl(apiUrl);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase: any = createClient(supabaseUrl, supabaseServiceKey);

    // Build target URL safely
    const target = new URL("/api/users", `${validatedUrl.protocol}//${validatedUrl.host}`);

    // Llamar a la API de Sede Académico (con timeout)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response: Response;
    try {
      response = await fetch(target.toString(), {
        headers: { "Content-Type": "application/json" },
        redirect: "error", // prevent redirect-based SSRF
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error("Error al conectar con Sede Académico");
    }

    const users = await response.json();
    if (!Array.isArray(users)) {
      throw new Error("Respuesta inválida de Sede Académico");
    }
    let syncedCount = 0;

    // Procesar cada usuario
    for (const user of users) {
      try {
        // Buscar si el usuario ya existe
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("numero_documento", user.documento)
          .single();

        let userId = existingProfile?.id;

        if (!existingProfile) {
          // Crear nuevo usuario en auth
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: user.email,
            email_confirm: true,
            user_metadata: {
              full_name: user.nombre_completo,
              username: user.username || user.email.split("@")[0],
            },
          });

          if (authError) {
            console.error(`Error creando usuario:`, authError);
            continue;
          }

          userId = authData.user.id;

          // Actualizar perfil
          await supabase
            .from("profiles")
            .update({
              full_name: user.nombre_completo,
              numero_documento: user.documento,
              tipo_documento: user.tipo_documento || "CC",
            })
            .eq("id", userId);
        }

        // Agregar como miembro de la institución si no existe
        const { error: memberError } = await supabase
          .from("institution_members")
          .insert({
            institution_id: institutionId,
            user_id: userId,
            member_role: user.rol || "student",
            status: "active",
          })
          .select()
          .single();

        if (!memberError || memberError.code === "23505") {
          syncedCount++;
        }
      } catch (error) {
        console.error(`Error procesando usuario`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: syncedCount,
        total: users.length 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    );
  }
});
