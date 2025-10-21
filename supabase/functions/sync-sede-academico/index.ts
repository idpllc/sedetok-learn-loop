import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { institutionId, apiUrl } = await req.json();

    if (!institutionId || !apiUrl) {
      throw new Error("institutionId y apiUrl son requeridos");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Llamar a la API de Sede Académico
    const response = await fetch(`${apiUrl}/api/users`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Error al conectar con Sede Académico");
    }

    const users = await response.json();
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
            console.error(`Error creando usuario ${user.email}:`, authError);
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
          // 23505 = duplicate key (ya existe)
          syncedCount++;
        }
      } catch (error) {
        console.error(`Error procesando usuario:`, error);
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
