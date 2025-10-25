import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserData {
  tipo_documento: string;
  numero_documento: string;
  email?: string;
  full_name?: string;
  username?: string;
  nit_institucion?: string;
  member_role?: string;
}

interface BulkResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    numero_documento: string;
    tipo_documento: string;
  };
  error?: string;
  numero_documento: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validar Content-Type
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({ 
          error: 'Content-Type debe ser application/json' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let requestData;
    try {
      requestData = await req.json();
    } catch (jsonError) {
      console.error('Error parsing JSON:', jsonError);
      return new Response(
        JSON.stringify({ 
          error: 'Body inválido o vacío. Debe enviar un JSON válido con un array de usuarios.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { users } = requestData;

    // Validar que users sea un array
    if (!Array.isArray(users)) {
      return new Response(
        JSON.stringify({ 
          error: 'El campo "users" debe ser un array de objetos con los datos de usuario' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validar límite de usuarios
    if (users.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Debe proporcionar al menos un usuario' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (users.length > 3000) {
      return new Response(
        JSON.stringify({ 
          error: 'No se pueden crear más de 3000 usuarios en una sola solicitud' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing bulk creation of ${users.length} users`);

    const results: BulkResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Procesar usuarios uno por uno
    for (const userData of users as UserData[]) {
      const { tipo_documento, numero_documento, email, full_name, username, nit_institucion, member_role } = userData;

      // Validar datos requeridos
      if (!tipo_documento || !numero_documento) {
        results.push({
          success: false,
          error: 'tipo_documento y numero_documento son requeridos',
          numero_documento: numero_documento || 'N/A'
        });
        errorCount++;
        continue;
      }

      try {
        // Verificar si el usuario ya existe por número de documento
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('numero_documento', numero_documento)
          .single();

        if (existingProfile) {
          results.push({
            success: false,
            error: 'Ya existe un usuario con ese número de documento',
            numero_documento
          });
          errorCount++;
          continue;
        }

        // Determinar el email a usar
        const userEmail = email && email.trim() !== '' 
          ? email 
          : `${numero_documento}@sedefy.com`;

        // La contraseña siempre será el número de documento
        const password = numero_documento;

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
          console.error(`Error creating user ${numero_documento}:`, authError);
          results.push({
            success: false,
            error: authError.message,
            numero_documento
          });
          errorCount++;
          continue;
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
          console.error(`Error updating profile for ${numero_documento}:`, profileError);
        }

        // Si se proporcionó NIT de institución, agregar al usuario como miembro
        if (nit_institucion && nit_institucion.trim() !== '') {
          const { data: institution } = await supabase
            .from('institutions')
            .select('id')
            .eq('nit', nit_institucion.trim())
            .single();

          if (institution) {
            // Validar el rol, si no es válido usar 'student' por defecto
            const validRoles = ['admin', 'teacher', 'student'];
            const finalRole = member_role && validRoles.includes(member_role) ? member_role : 'student';

            const { error: memberError } = await supabase
              .from('institution_members')
              .insert({
                institution_id: institution.id,
                user_id: authData.user.id,
                member_role: finalRole,
                invited_by: institution.id, // Usar el ID de la institución como invitador
                status: 'active'
              });

            if (memberError) {
              console.error(`Error adding user ${numero_documento} to institution:`, memberError);
            }
          } else {
            console.warn(`Institution with NIT ${nit_institucion} not found for user ${numero_documento}`);
          }
        }

        results.push({
          success: true,
          user: {
            id: authData.user.id,
            email: userEmail,
            numero_documento: numero_documento,
            tipo_documento: tipo_documento
          },
          numero_documento
        });
        successCount++;

      } catch (error) {
        console.error(`Unexpected error processing ${numero_documento}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        results.push({
          success: false,
          error: errorMessage,
          numero_documento
        });
        errorCount++;
      }
    }

    console.log(`Bulk creation completed: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true,
        summary: {
          total: users.length,
          success: successCount,
          errors: errorCount
        },
        results: results
      }),
      { 
        status: 200, 
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
