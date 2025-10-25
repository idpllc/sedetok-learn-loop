import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubjectResult {
  numero_documento: string;
  area_academica: string;
  asignatura_nombre: string;
  asignatura_codigo?: string;
  periodo_academico: string;
  score: number;
  max_score: number;
  passed?: boolean;
  nit_institucion?: string;
  nombre_sede?: string;
  grado?: string;
  grupo?: string;
  docente_nombre?: string;
  observaciones?: string;
  completed_at?: string;
}

interface RequestBody {
  institution_id: string;
  results: SubjectResult[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return new Response(
        JSON.stringify({ 
          error: "Content-Type debe ser application/json" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ 
          error: "Body inválido o vacío. Debe enviar un JSON válido." 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { institution_id, results } = body;

    if (!institution_id || !results) {
      return new Response(
        JSON.stringify({ 
          error: "institution_id y results son requeridos" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!Array.isArray(results)) {
      return new Response(
        JSON.stringify({ 
          error: "results debe ser un array" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (results.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "El array de results no puede estar vacío" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (results.length > 5000) {
      return new Response(
        JSON.stringify({ 
          error: "Máximo 5000 resultados por solicitud" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar que la institución existe
    const { data: institution, error: instError } = await supabase
      .from("institutions")
      .select("id")
      .eq("id", institution_id)
      .single();

    if (instError || !institution) {
      return new Response(
        JSON.stringify({ 
          error: "Institución no encontrada" 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const processedResults = [];
    const errors = [];

    for (const result of results) {
      try {
        // Validar campos requeridos
        if (!result.numero_documento || !result.area_academica || 
            !result.asignatura_nombre || !result.periodo_academico ||
            result.score === undefined || result.max_score === undefined) {
          errors.push({
            numero_documento: result.numero_documento,
            error: "Campos requeridos faltantes: numero_documento, area_academica, asignatura_nombre, periodo_academico, score, max_score"
          });
          continue;
        }

        // Buscar usuario por numero_documento
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("numero_documento", result.numero_documento)
          .single();

        if (profileError || !profile) {
          errors.push({
            numero_documento: result.numero_documento,
            error: "Usuario no encontrado con ese número de documento"
          });
          continue;
        }

        // Insertar resultado
        const { error: insertError } = await supabase
          .from("user_subject_results")
          .insert({
            user_id: profile.id,
            institution_id: institution_id,
            area_academica: result.area_academica,
            asignatura_nombre: result.asignatura_nombre,
            asignatura_codigo: result.asignatura_codigo || null,
            periodo_academico: result.periodo_academico,
            score: result.score,
            max_score: result.max_score,
            passed: result.passed ?? (result.score >= (result.max_score * 0.6)),
            nit_institucion: result.nit_institucion || null,
            nombre_sede: result.nombre_sede || null,
            grado: result.grado || null,
            grupo: result.grupo || null,
            docente_nombre: result.docente_nombre || null,
            observaciones: result.observaciones || null,
            completed_at: result.completed_at || new Date().toISOString(),
          });

        if (insertError) {
          errors.push({
            numero_documento: result.numero_documento,
            error: insertError.message
          });
          continue;
        }

        processedResults.push({
          numero_documento: result.numero_documento,
          status: "success"
        });

      } catch (error) {
        errors.push({
          numero_documento: result.numero_documento,
          error: error instanceof Error ? error.message : "Error desconocido"
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: results.length,
        processed: processedResults.length,
        errors: errors.length,
        details: {
          processed: processedResults,
          errors: errors
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("Error en submit-subject-results:", error);
    return new Response(
      JSON.stringify({ 
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
