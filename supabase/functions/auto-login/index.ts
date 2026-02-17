import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SECRET_KEY = "tucanmistico";

async function generateHMAC(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function verifyHMAC(message: string, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = await generateHMAC(message, secret);
  return expectedSignature === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Accept both JSON body and query params
    let token: string | null = null;
    let documento: string | null = null;

    const url = new URL(req.url);
    token = url.searchParams.get("token");
    documento = url.searchParams.get("documento");

    if (!token && !documento) {
      try {
        const body = await req.json();
        token = body.token || null;
        documento = body.documento || body.numero_documento || null;
      } catch {
        // No body
      }
    }

    // ===== MODE 1: Login by document number (simple, no token needed) =====
    if (documento && !token) {
      console.log(`Auto-login by documento: ${documento}`);

      // Find user by document number
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("numero_documento", documento)
        .limit(1)
        .single();

      if (!profile) {
        return new Response(
          JSON.stringify({ error: "Usuario no encontrado con ese número de documento" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get email from auth
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
      if (!authUser?.user?.email) {
        return new Response(
          JSON.stringify({ error: "No se pudo obtener el email del usuario" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Password is always the document number (set during sync-institution-batch)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: authUser.user.email,
        password: documento,
      });

      if (signInError) {
        console.error("Sign in error:", signInError);
        return new Response(
          JSON.stringify({ error: "Credenciales inválidas", details: signInError.message }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          session: signInData.session,
          user: signInData.user,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== MODE 2: Login by signed token (legacy) =====
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Se requiere 'token' o 'documento'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parts = token.split(".");
    if (parts.length !== 2) {
      return new Response(
        JSON.stringify({ error: "Formato de token inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [encodedData, encodedHmac] = parts;
    const isValid = await verifyHMAC(encodedData, encodedHmac, SECRET_KEY);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Token inválido o manipulado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let decodedData;
    try {
      decodedData = JSON.parse(atob(encodedData));
    } catch {
      return new Response(
        JSON.stringify({ error: "Token corrupto" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, numero_documento, password, timestamp } = decodedData;

    // Validate timestamp (5 min)
    if (timestamp) {
      const tokenAge = Date.now() - timestamp;
      if (tokenAge > 5 * 60 * 1000) {
        return new Response(
          JSON.stringify({ error: "Token expirado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Determine email
    let loginEmail = email;
    let loginPassword = password;

    if (!loginEmail && numero_documento) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("numero_documento", numero_documento)
        .limit(1)
        .single();

      if (profile) {
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
        if (authUser?.user) {
          loginEmail = authUser.user.email;
          // If no password in token, use documento as password
          if (!loginPassword) loginPassword = numero_documento;
        }
      }
    }

    if (!loginEmail || !loginPassword) {
      return new Response(
        JSON.stringify({ error: "Credenciales incompletas en el token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: "Credenciales inválidas", details: authError.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, session: authData.session, user: authData.user }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
