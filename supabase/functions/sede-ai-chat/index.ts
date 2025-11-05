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
      return new Response(JSON.stringify({ error: 'Unauthorized: missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const token = authHeader.replace('Bearer ', '').trim();

    // Admin client to validate JWT securely
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error (getUser):', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // User-scoped client to respect RLS with user's JWT
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

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

IMPORTANTE: Cuando el usuario pregunte sobre rutas de aprendizaje, cursos o temas específicos, DEBES usar la función search_learning_paths para buscar rutas reales en SEDEFY. NO inventes rutas.

Contexto del estudiante actual:
${userContext}

Directrices:
- Sé amigable, motivador y profesional
- Usa datos concretos del estudiante para personalizar tus respuestas
- Sugiere acciones específicas y alcanzables
- Si recomiendas algo, explica por qué es relevante para este estudiante
- Mantén respuestas concisas pero informativas
- Usa emojis ocasionalmente para hacer la conversación más amena
- Si el estudiante no tiene suficientes datos, sugiere actividades para empezar
- Cuando busques rutas, usa la función search_learning_paths y asegúrate de incluir el marcador especial en tu respuesta para que se muestren las tarjetas`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Define tools for the AI
    const tools = [
      {
        type: "function",
        function: {
          name: "search_learning_paths",
          description: "Busca rutas de aprendizaje en SEDEFY. Usa esta función cuando el usuario pregunte sobre rutas, cursos, o temas específicos de aprendizaje.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Términos de búsqueda o tema de la ruta"
              },
              category: {
                type: "string",
                description: "Categoría de la ruta (opcional)"
              },
              limit: {
                type: "number",
                description: "Número máximo de resultados (default: 5)"
              }
            },
            required: ["query"]
          }
        }
      }
    ];

    // First call to AI with tools
    const initialResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        tools,
        temperature: 0.8,
      }),
    });

    if (!initialResponse.ok) {
      throw new Error(`AI gateway error: ${initialResponse.status}`);
    }

    const initialData = await initialResponse.json();
    const choice = initialData.choices?.[0];

    // Check if AI wants to use a tool
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      
      if (toolCall.function.name === "search_learning_paths") {
        const args = JSON.parse(toolCall.function.arguments);
        const searchQuery = args.query || "";
        const limit = args.limit || 5;

        // Search for learning paths
        let query = supabase
          .from('learning_paths')
          .select('id, title, description, cover_url, thumbnail_url, category, subject, tags, creator_id, profiles!learning_paths_creator_id_fkey(full_name, avatar_url)')
          .eq('is_public', true)
          .limit(limit);

        // Search in title, description, subject, or tags
        if (searchQuery) {
          query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`);
        }

        if (args.category) {
          query = query.eq('category', args.category);
        }

        const { data: paths, error: pathsError } = await query;

        if (pathsError) {
          console.error('Error searching paths:', pathsError);
        }

        // Format paths for AI response
        const pathsInfo = paths?.map(p => {
          const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
          return {
            id: p.id,
            title: p.title,
            description: p.description,
            category: p.category,
            subject: p.subject,
            creator: profile?.full_name,
            cover_url: p.cover_url || p.thumbnail_url
          };
        }) || [];

        // Second call to AI with tool results
        const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              { role: "user", content: message },
              choice.message,
              {
                role: "tool",
                tool_call_id: toolCall.id,
                name: toolCall.function.name,
                content: JSON.stringify({
                  paths: pathsInfo,
                  message: `Encontré ${pathsInfo.length} rutas. IMPORTANTE: Debes incluir en tu respuesta el siguiente bloque especial al final para mostrar las tarjetas: |||PATHS_DATA:${JSON.stringify(pathsInfo)}|||`
                })
              }
            ],
            stream: true,
            temperature: 0.8,
          }),
        });

        if (!finalResponse.ok) {
          if (finalResponse.status === 429) {
            return new Response(JSON.stringify({ error: "Límite de solicitudes excedido, intenta más tarde." }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (finalResponse.status === 402) {
            return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          throw new Error(`AI gateway error: ${finalResponse.status}`);
        }

        return new Response(finalResponse.body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }
    }

    // If no tool call, proceed with normal streaming
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