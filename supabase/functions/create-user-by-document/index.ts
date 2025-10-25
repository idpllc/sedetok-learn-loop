import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      tipo_documento, 
      numero_documento, 
      email, 
      full_name,
      username 
    } = await req.json();

    // Validar datos requeridos
    if (!tipo_documento || !numero_documento) {
      return new Response(
        JSON.stringify({ 
          error: 'tipo_documento y numero_documento son requeridos' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verificar si el usuario ya existe por número de documento
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('numero_documento', numero_documento)
      .single();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ 
          error: 'Ya existe un usuario con ese número de documento' 
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Determinar el email a usar
    const userEmail = email && email.trim() !== '' 
      ? email 
      : `${numero_documento}@sedefy.com`;

    // La contraseña siempre será el número de documento
    const password = numero_documento;

    console.log(`Creating user with email: ${userEmail}`);

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userEmail,
      password: password,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        full_name: full_name || '',
        username: username || numero_documento,
        tipo_documento: tipo_documento,
        numero_documento: numero_documento
      }
    });

    if (authError) {
      console.error('Error creating user:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Error al crear usuario', 
          details: authError.message 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Actualizar el perfil con los datos adicionales
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        tipo_documento: tipo_documento,
        numero_documento: numero_documento,
        full_name: full_name || '',
        username: username || numero_documento
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // No retornamos error aquí porque el usuario ya fue creado
    }

    console.log(`User created successfully: ${authData.user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: authData.user.id,
          email: userEmail,
          numero_documento: numero_documento,
          tipo_documento: tipo_documento,
          message: 'Usuario creado exitosamente. Contraseña: número de documento'
        }
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor', 
        details: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
