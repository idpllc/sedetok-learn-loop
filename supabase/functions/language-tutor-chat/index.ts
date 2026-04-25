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
    const { message, conversationId, sessionId } = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const token = authHeader.replace('Bearer ', '').trim();

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // Load user context in parallel
    const [profileData, assessmentData, sessionData, skillScoresData] = await Promise.all([
      supabase.from('profiles')
        .select('full_name, experience_points, areas_interes, nivel_educativo, grado_actual')
        .eq('id', user.id)
        .single(),
      supabase.from('language_assessments')
        .select('*')
        .eq('user_id', user.id)
        .single(),
      sessionId
        ? supabase.from('language_assessment_sessions')
            .select('*')
            .eq('id', sessionId)
            .single()
        : Promise.resolve({ data: null }),
      supabase.from('language_skill_scores')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(12),
    ]);

    const profile = profileData.data;
    const assessment = assessmentData.data;
    const currentSession = sessionData.data;
    const skillScores = skillScoresData.data || [];

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

    // Build context
    const hasLevel = !!assessment?.current_level;
    const currentLevel = assessment?.current_level || 'No evaluado';

    const skillSummary = skillScores.length > 0
      ? skillScores.map((s: any) => `${s.skill}: ${s.level || 'N/A'} (${s.score}/${s.max_score})`).join(', ')
      : 'Sin evaluación de habilidades';

    const sessionContext = currentSession
      ? `\nSesión activa: ${currentSession.session_type} - Estado: ${currentSession.status}
Preguntas: ${currentSession.total_questions}, Correctas: ${currentSession.correct_answers}
Fortalezas detectadas: ${currentSession.strengths?.join(', ') || 'Ninguna aún'}
Debilidades detectadas: ${currentSession.weaknesses?.join(', ') || 'Ninguna aún'}`
      : '';

    const systemPrompt = `Eres LINGUA, la tutora especialista en inglés de SEDEFY. Tu objetivo es evaluar, enseñar y mejorar el nivel de inglés de los estudiantes de manera adaptativa y personalizada.

🎯 TU MISIÓN:
${!hasLevel ? `
- El estudiante NO tiene un nivel de inglés registrado
- DEBES EVALUARLO mediante conversación natural
- Comienza en ESPAÑOL, presentándote y explicando que harás una evaluación rápida
- Haz preguntas progresivas: empieza con A1 y sube de nivel si responde bien
- Incluye preguntas de: vocabulary, grammar, reading comprehension, y producción escrita
- Evalúa entre 8-12 preguntas antes de determinar el nivel
- Cuando determines el nivel, usa la herramienta save_assessment_result
` : `
- El estudiante tiene nivel: ${currentLevel}
- Enfócate en ENSEÑAR contenido apropiado para su nivel
- Trabaja en sus debilidades: ${currentSession?.weaknesses?.join(', ') || 'revisa habilidades generales'}
- Gradualmente introduce contenido del siguiente nivel
- Si el estudiante demuestra dominio consistente, sugiere re-evaluación
`}

📊 DATOS DEL ESTUDIANTE:
Nombre: ${profile?.full_name || 'Estudiante'}
Nivel actual de inglés: ${currentLevel}
Nivel educativo: ${profile?.nivel_educativo || 'No especificado'}
Grado: ${profile?.grado_actual || 'No especificado'}
Habilidades: ${skillSummary}
${sessionContext}

📋 FRAMEWORK CEFR:
- A1 (Principiante): Frases básicas, presentarse, preguntas simples
- A2 (Elemental): Situaciones cotidianas, descripciones simples, rutinas
- B1 (Intermedio): Opiniones, experiencias, planes futuros, textos simples
- B2 (Intermedio alto): Temas abstractos, argumentación, textos complejos
- C1 (Avanzado): Uso fluido, matices, textos largos y complejos
- C2 (Maestría): Comprensión total, expresión precisa y espontánea

🧠 ESTRATEGIA DE EVALUACIÓN:
1. Empieza siempre en español para dar confianza
2. Introduce inglés gradualmente según el nivel detectado
3. Para cada nivel, evalúa:
   - Grammar: estructuras gramaticales del nivel
   - Vocabulary: rango de vocabulario
   - Reading: comprensión de textos
   - Writing: producción escrita
   - Listening: (simula con dictados o transcripciones)
   - Speaking: (evalúa calidad de expresión escrita como proxy)
4. Usa retroalimentación positiva siempre
5. Explica errores de forma clara y constructiva

🎓 ESTRATEGIA DE ENSEÑANZA (cuando ya tiene nivel):
- Presenta lecciones cortas y prácticas
- Usa ejemplos contextualizados
- Incluye ejercicios interactivos en el chat
- Alterna entre español e inglés según el nivel
- Para A1-A2: 70% español, 30% inglés
- Para B1-B2: 40% español, 60% inglés  
- Para C1-C2: 10% español, 90% inglés
- Celebra logros y progreso

💡 FORMATO:
- Respuestas concisas y claras
- Usa emojis para hacer más amena la conversación
- Formatea ejercicios de forma clara
- Cuando hagas preguntas de evaluación, numera las opciones
- Al finalizar evaluación: resume nivel, fortalezas, debilidades y plan de mejora`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Define tools
    const tools = [
      {
        type: "function",
        function: {
          name: "save_assessment_result",
          description: "Guarda el resultado de la evaluación de nivel de inglés del estudiante. Usa esta herramienta SOLO cuando hayas determinado con suficiente confianza el nivel CEFR del estudiante después de evaluar múltiples habilidades.",
          parameters: {
            type: "object",
            properties: {
              level: {
                type: "string",
                description: "El nivel CEFR determinado",
                enum: ["A1", "A2", "B1", "B2", "C1", "C2"]
              },
              strengths: {
                type: "array",
                items: { type: "string" },
                description: "Lista de fortalezas detectadas en el estudiante"
              },
              weaknesses: {
                type: "array",
                items: { type: "string" },
                description: "Lista de debilidades o áreas de mejora detectadas"
              },
              recommendations: {
                type: "string",
                description: "Recomendaciones personalizadas para mejorar"
              },
              skill_scores: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    skill: { type: "string", enum: ["grammar", "vocabulary", "listening", "speaking", "reading", "writing"] },
                    level: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
                    score: { type: "number", description: "Score 0-100" }
                  },
                  required: ["skill", "level", "score"]
                },
                description: "Puntuaciones por habilidad"
              },
              total_questions: {
                type: "number",
                description: "Total de preguntas realizadas"
              },
              correct_answers: {
                type: "number",
                description: "Total de respuestas correctas"
              }
            },
            required: ["level", "strengths", "weaknesses", "recommendations", "skill_scores"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_level_exercises",
          description: "Obtiene ejercicios y contenido apropiado para el nivel CEFR del estudiante. Usa cuando necesites material de práctica.",
          parameters: {
            type: "object",
            properties: {
              level: {
                type: "string",
                enum: ["A1", "A2", "B1", "B2", "C1", "C2"],
                description: "Nivel CEFR para los ejercicios"
              },
              skill: {
                type: "string",
                enum: ["grammar", "vocabulary", "listening", "speaking", "reading", "writing"],
                description: "Habilidad específica a practicar"
              }
            },
            required: ["level", "skill"]
          }
        }
      }
    ];

    // Call AI
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
        temperature: 0.7,
      }),
    });

    if (!initialResponse.ok) {
      throw new Error(`AI gateway error: ${initialResponse.status}`);
    }

    const initialData = await initialResponse.json();
    const choice = initialData.choices?.[0];

    // Handle tool calls
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];

      if (toolCall.function.name === "save_assessment_result") {
        const args = JSON.parse(toolCall.function.arguments);

        // Save/update the main assessment using admin client to bypass RLS for upsert
        await supabaseAdmin.from('language_assessments').upsert({
          user_id: user.id,
          current_level: args.level,
          previous_level: assessment?.current_level || null,
          assessed_at: new Date().toISOString(),
          assessment_method: 'tutor_conversation',
          notes: args.recommendations,
        }, { onConflict: 'user_id' });

        // Create/update session
        const sessionUpsert: any = {
          user_id: user.id,
          determined_level: args.level,
          session_type: 'evaluation',
          status: 'completed',
          strengths: args.strengths,
          weaknesses: args.weaknesses,
          recommendations: args.recommendations,
          total_questions: args.total_questions || 0,
          correct_answers: args.correct_answers || 0,
          completed_at: new Date().toISOString(),
        };

        if (sessionId) {
          await supabaseAdmin.from('language_assessment_sessions')
            .update(sessionUpsert)
            .eq('id', sessionId);
        } else {
          sessionUpsert.conversation_id = conversationId;
          const { data: newSession } = await supabaseAdmin.from('language_assessment_sessions')
            .insert(sessionUpsert)
            .select('id')
            .single();

          // Save skill scores
          if (newSession && args.skill_scores) {
            const skillInserts = args.skill_scores.map((s: any) => ({
              session_id: newSession.id,
              user_id: user.id,
              skill: s.skill,
              level: s.level,
              score: s.score,
              max_score: 100,
            }));
            await supabaseAdmin.from('language_skill_scores').insert(skillInserts);
          }
        }

        // Get follow-up response
        const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                content: JSON.stringify({
                  success: true,
                  level: args.level,
                  message: `Nivel ${args.level} guardado exitosamente. Fortalezas: ${args.strengths.join(', ')}. Debilidades: ${args.weaknesses.join(', ')}.`
                })
              }
            ],
            temperature: 0.7,
          }),
        });

        const followUpData = await followUpResponse.json();
        const finalMessage = followUpData.choices?.[0]?.message?.content || 
          `¡Evaluación completada! Tu nivel de inglés es **${args.level}**. 🎉`;

        return new Response(JSON.stringify({
          message: finalMessage,
          assessment: {
            level: args.level,
            strengths: args.strengths,
            weaknesses: args.weaknesses,
            skill_scores: args.skill_scores,
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (toolCall.function.name === "get_level_exercises") {
        const args = JSON.parse(toolCall.function.arguments);

        // Generate exercises based on level and skill
        const exercisePrompt = `Generate a short, interactive ${args.skill} exercise for CEFR level ${args.level}. 
Include: the exercise, answer options (if applicable), and the correct answer explanation.
Format it nicely for a chat interface.`;

        const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                content: JSON.stringify({
                  level: args.level,
                  skill: args.skill,
                  instruction: exercisePrompt,
                })
              }
            ],
            temperature: 0.7,
          }),
        });

        const followUpData = await followUpResponse.json();
        const finalMessage = followUpData.choices?.[0]?.message?.content || 
          'No pude generar ejercicios en este momento.';

        return new Response(JSON.stringify({ message: finalMessage }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // No tool calls - direct response
    const responseMessage = choice?.message?.content || 'No pude generar una respuesta. Por favor intenta de nuevo.';

    return new Response(JSON.stringify({ message: responseMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Language tutor error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
