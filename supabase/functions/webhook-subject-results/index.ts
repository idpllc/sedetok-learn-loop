import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-key',
};

interface SubjectResult {
  tipo_documento: string;
  numero_documento: string;
  nit_institucion: string;
  nombre_sede?: string;
  area_academica: string;
  asignatura_nombre: string;
  grado: string;
  grupo: string;
  periodo_academico: string;
  score: number;
  max_score: number;
  passed: boolean;
  docente_nombre?: string;
  observaciones?: string;
  completed_at?: string;
}

interface WebhookPayload {
  results: SubjectResult[];
  source?: string;
  timestamp?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Webhook received:', new Date().toISOString());

  try {
    // Verificar API Key del webhook
    const webhookKey = req.headers.get('x-webhook-key');
    const expectedKey = Deno.env.get('WEBHOOK_API_KEY');

    if (!webhookKey || webhookKey !== expectedKey) {
      console.error('Unauthorized webhook attempt');
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized',
          message: 'Invalid or missing webhook API key'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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

    const payload: WebhookPayload = await req.json();
    console.log('Webhook payload:', JSON.stringify(payload, null, 2));

    if (!payload.results || !Array.isArray(payload.results)) {
      return new Response(
        JSON.stringify({ 
          error: 'El campo "results" es requerido y debe ser un array' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (payload.results.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'El array "results" debe contener al menos un resultado' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Áreas académicas válidas
    const validAreas = [
      'Ciencias Naturales',
      'Ciencias Sociales',
      'Matemáticas',
      'Lenguaje',
      'Inglés',
      'Educación Física',
      'Artes',
      'Tecnología',
      'Ética y Valores',
      'Religión',
      'Filosofía',
      'Ciencias Políticas y Económicas'
    ];

    const processedResults = [];
    const errors = [];

    for (const result of payload.results) {
      const {
        tipo_documento,
        numero_documento,
        nit_institucion,
        nombre_sede,
        area_academica,
        asignatura_nombre,
        grado,
        grupo,
        periodo_academico,
        score,
        max_score,
        passed,
        docente_nombre,
        observaciones,
        completed_at
      } = result;

      // Validar campos requeridos
      if (!tipo_documento || !numero_documento || !nit_institucion || 
          !area_academica || !asignatura_nombre || !grado || !grupo ||
          !periodo_academico || score === undefined || !max_score) {
        errors.push({
          numero_documento: numero_documento || 'N/A',
          error: 'Faltan campos requeridos',
          result
        });
        continue;
      }

      // Validar área académica
      if (!validAreas.includes(area_academica)) {
        errors.push({
          numero_documento,
          error: `Área académica inválida: ${area_academica}. Debe ser una de: ${validAreas.join(', ')}`
        });
        continue;
      }

      try {
        // Buscar institución por NIT
        const { data: institution, error: instError } = await supabase
          .from('institutions')
          .select('id')
          .eq('nit', nit_institucion.trim())
          .single();

        if (instError || !institution) {
          errors.push({
            numero_documento,
            error: `Institución con NIT ${nit_institucion} no encontrada`
          });
          continue;
        }

        // Buscar usuario por documento
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('numero_documento', numero_documento)
          .eq('tipo_documento', tipo_documento)
          .single();

        if (profileError || !profile) {
          errors.push({
            numero_documento,
            error: 'Usuario no encontrado'
          });
          continue;
        }

        // Insertar resultado
        const { error: insertError } = await supabase
          .from('user_subject_results')
          .insert({
            user_id: profile.id,
            institution_id: institution.id,
            nit_institucion: nit_institucion.trim(),
            nombre_sede: nombre_sede || null,
            area_academica,
            asignatura_nombre,
            grado,
            grupo,
            periodo_academico,
            score: Number(score),
            max_score: Number(max_score),
            passed: Boolean(passed),
            docente_nombre: docente_nombre || null,
            observaciones: observaciones || null,
            completed_at: completed_at ? new Date(completed_at).toISOString() : new Date().toISOString()
          });

        if (insertError) {
          console.error('Error inserting result:', insertError);
          errors.push({
            numero_documento,
            error: insertError.message
          });
          continue;
        }

        processedResults.push({
          numero_documento,
          asignatura_nombre,
          success: true
        });

      } catch (error) {
        console.error(`Error processing result for ${numero_documento}:`, error);
        errors.push({
          numero_documento,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    console.log(`Webhook processed: ${processedResults.length} success, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: payload.results.length,
          processed: processedResults.length,
          errors: errors.length
        },
        processed: processedResults,
        errors: errors.length > 0 ? errors : undefined,
        source: payload.source,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
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
