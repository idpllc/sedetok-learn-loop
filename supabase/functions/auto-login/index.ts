import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SECRET_KEY = "tucanmistico";

async function generateHMAC(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function verifyHMAC(message: string, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = await generateHMAC(message, secret);
  return expectedSignature === signature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Token requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // El token tiene formato: base64(data).base64(hmac)
    const parts = token.split('.');
    if (parts.length !== 2) {
      return new Response(
        JSON.stringify({ error: 'Formato de token inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [encodedData, encodedHmac] = parts;

    // Verificar HMAC
    const isValid = await verifyHMAC(encodedData, encodedHmac, SECRET_KEY);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Token inválido o manipulado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decodificar datos
    let decodedData;
    try {
      const dataString = atob(encodedData);
      decodedData = JSON.parse(dataString);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Token corrupto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, numero_documento, password, timestamp } = decodedData;

    // Validar timestamp (token válido por 5 minutos)
    if (timestamp) {
      const tokenAge = Date.now() - timestamp;
      const fiveMinutes = 5 * 60 * 1000;
      if (tokenAge > fiveMinutes) {
        return new Response(
          JSON.stringify({ error: 'Token expirado' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Determinar el email a usar
    let loginEmail = email;
    if (!loginEmail && numero_documento) {
      // Buscar usuario por número de documento
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('numero_documento', numero_documento)
        .single();

      if (profile) {
        // Obtener email del usuario en auth.users
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
        if (authUser.user) {
          loginEmail = authUser.user.email;
        }
      }
    }

    if (!loginEmail || !password) {
      return new Response(
        JSON.stringify({ error: 'Credenciales incompletas en el token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Auto-login attempt for: ${loginEmail}`);

    // Intentar login con las credenciales
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: password,
    });

    if (authError) {
      console.error('Auto-login error:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Credenciales inválidas',
          details: authError.message 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Auto-login successful for: ${loginEmail}`);

    return new Response(
      JSON.stringify({
        success: true,
        session: authData.session,
        user: authData.user
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
