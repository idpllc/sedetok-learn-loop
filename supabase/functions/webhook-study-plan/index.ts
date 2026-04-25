import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-key',
};

interface Evaluacion {
  descripcion: string;
  nota: number | null;
}

interface Competencia {
  nombre_competencia: string;
  calificacion_competencia: number | null;
  evaluaciones: Evaluacion[];
}

interface Asignatura {
  nombre_asignatura: string;
  nota_final_asignatura: number | null;
  competencias: Competencia[];
}

interface Periodo {
  periodo_nombre: string;
  asignaturas: Asignatura[];
}

interface StudyPlanPayload {
  institucion: {
    id?: string;
    nit: string;
  };
  estudiante: {
    id?: string;
    document_number: string;
    curso_academico: string;
    grado: string;
  };
  periodos: Periodo[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Study plan webhook received:', new Date().toISOString());

  try {
    const webhookKey = req.headers.get('x-webhook-key');
    const validKeys = [
      Deno.env.get('WEBHOOK_API_KEY'),
      Deno.env.get('CHAT_JWT_SECRET'),
    ].filter(Boolean) as string[];

    if (!webhookKey || !validKeys.includes(webhookKey)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid or missing webhook API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({ error: 'Content-Type debe ser application/json' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase: any = createClient(supabaseUrl, supabaseServiceKey);

    const payload: StudyPlanPayload = await req.json();
    console.log('Study plan payload:', JSON.stringify(payload, null, 2));

    // Validate required fields
    if (!payload.institucion?.nit || !payload.estudiante?.document_number || 
        !payload.estudiante?.curso_academico || !payload.estudiante?.grado || !payload.periodos) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos: institucion.nit, estudiante.document_number, estudiante.curso_academico, estudiante.grado, periodos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find institution by NIT
    const { data: institution, error: instError } = await supabase
      .from('institutions')
      .select('id')
      .eq('nit', payload.institucion.nit.trim())
      .single();

    if (instError || !institution) {
      return new Response(
        JSON.stringify({ error: `Institución con NIT ${payload.institucion.nit} no encontrada` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find student by document number
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('numero_documento', payload.estudiante.document_number)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: `Estudiante con documento ${payload.estudiante.document_number} no encontrado` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert study plan (unique on user_id + academic_year)
    const { data: studyPlan, error: upsertError } = await supabase
      .from('student_study_plans')
      .upsert({
        user_id: profile.id,
        institution_id: institution.id,
        institution_nit: payload.institucion.nit.trim(),
        document_number: payload.estudiante.document_number,
        academic_year: payload.estudiante.curso_academico,
        grade: payload.estudiante.grado,
        periodos: payload.periodos,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,academic_year',
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting study plan:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Error al guardar plan de estudios', details: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Plan de estudios actualizado correctamente',
        study_plan_id: studyPlan.id,
        student_id: profile.id,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
