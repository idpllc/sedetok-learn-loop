import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user's JWT for auth and queries
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }
    
    console.log('Authenticated user:', user.id);

    // Get user context
    const [profileData, metricsData, pathsData, coursesData, vocationalData] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.rpc('get_user_academic_metrics', { user_uuid: user.id }),
      supabase.from('learning_paths').select('*, path_progress(*)').eq('created_by', user.id),
      supabase.from('user_courses').select('*, courses(*)').eq('user_id', user.id),
      supabase.from('vocational_profiles').select('*').eq('user_id', user.id).single()
    ]);

    // Get conversation history
    let messages: Array<{ role: string; content: string }> = [];
    if (conversationId) {
      const { data: historyData } = await supabase
        .from('ai_chat_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      messages = historyData || [];
    }

    // Build user context
    const profile = profileData.data;
    const metrics = metricsData.data || [];
    const paths = pathsData.data || [];
    const courses = coursesData.data || [];
    const vocationalProfile = vocationalData.data;

    const userContext = `
Estudiante: ${profile?.full_name || 'Usuario'}
Nivel XP: ${profile?.xp_level || 0} (${profile?.xp_points || 0} puntos)
Educoins: ${profile?.educoins || 0}

Métricas Académicas:
${metrics.map((m: any) => `- ${m.area}: ${m.total_score}% (${m.quiz_count} quizzes, ${m.video_count} videos)`).join('\n')}

Rutas de Aprendizaje:
${paths.length > 0 ? paths.map((p: any) => `- ${p.title}: ${p.path_progress?.length || 0} en progreso`).join('\n') : 'No tiene rutas activas'}

Cursos:
${courses.length > 0 ? courses.map((c: any) => `- ${c.courses?.title}`).join('\n') : 'No está inscrito en cursos'}

Perfil Vocacional:
${vocationalProfile ? `
- Confianza: ${vocationalProfile.confidence_level}
- Top 3 Carreras: ${vocationalProfile.recommendations?.slice(0, 3).map((r: any) => r.career_name).join(', ')}
` : 'No tiene perfil vocacional generado'}
`;

    const systemPrompt = `Eres SEDE AI, un asistente educativo inteligente y personalizado para la plataforma SEDEFY. 

Tu misión es:
- Ayudar a los estudiantes a alcanzar sus metas educativas
- Sugerir rutas de aprendizaje personalizadas basadas en su rendimiento
- Recomendar cursos y contenido relevante
- Analizar su progreso y dar feedback constructivo
- Motivar y guiar en su desarrollo académico y profesional

Contexto del estudiante actual:
${userContext}

Directrices:
- Sé amigable, motivador y profesional
- Usa datos concretos del estudiante para personalizar tus respuestas
- Sugiere acciones específicas y alcanzables
- Si recomiendas algo, explica por qué es relevante para este estudiante
- Mantén respuestas concisas pero informativas
- Usa emojis ocasionalmente para hacer la conversación más amena
- Si el estudiante no tiene suficientes datos, sugiere actividades para empezar`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
          { role: "user", content: message }
        ],
        stream: true,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido, intenta más tarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Error in sede-ai-chat:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});