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
    const { message, conversationId, attachments } = await req.json();
    
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
    const startTime = Date.now();

    // Get user context - optimized queries with limits
    const [profileData, pathProgressData, vocationalData] = await Promise.all([
      supabase.from('profiles')
        .select('full_name, experience_points, educoins, areas_interes, numero_documento')
        .eq('id', user.id)
        .single(),
      supabase.from('user_path_progress')
        .select('path_id, completed, learning_paths(title)')
        .eq('user_id', user.id)
        .limit(10),
      supabase.from('vocational_profiles')
        .select('summary')
        .eq('user_id', user.id)
        .single()
    ]);

    console.log(`Context loaded in ${Date.now() - startTime}ms`);

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

    // Build user context (lightweight)
    const profile = profileData.data;
    const pathProgress = pathProgressData.data || [];
    const vocationalProfile = vocationalData.data;

    // Fetch student study plans
    let studyPlanContext = '';
    try {
      // Query by user_id OR document_number
      let studyPlanQuery = supabaseAdmin
        .from('student_study_plans')
        .select('*')
        .order('academic_year', { ascending: false })
        .limit(3);

      if (profile?.numero_documento) {
        studyPlanQuery = studyPlanQuery.or(`user_id.eq.${user.id},document_number.eq.${profile.numero_documento}`);
      } else {
        studyPlanQuery = studyPlanQuery.eq('user_id', user.id);
      }

      const { data: studyPlans } = await studyPlanQuery;

      if (studyPlans && studyPlans.length > 0) {
        // Analyze competencies with low grades
        const lowCompetencies: Array<{ asignatura: string; competencia: string; nota: number | null; periodo: string }> = [];
        const allSubjects: Array<{ asignatura: string; nota: number | null; periodo: string }> = [];

        for (const plan of studyPlans) {
          const periodos = (plan.periodos || []) as Array<any>;
          for (const periodo of periodos) {
            for (const asignatura of (periodo.asignaturas || [])) {
              allSubjects.push({
                asignatura: asignatura.nombre_asignatura,
                nota: asignatura.nota_final_asignatura,
                periodo: periodo.periodo_nombre
              });
              for (const competencia of (asignatura.competencias || [])) {
                if (competencia.calificacion_competencia !== null && competencia.calificacion_competencia < 3.5) {
                  lowCompetencies.push({
                    asignatura: asignatura.nombre_asignatura,
                    competencia: competencia.nombre_competencia,
                    nota: competencia.calificacion_competencia,
                    periodo: periodo.periodo_nombre
                  });
                }
              }
            }
          }
        }

        const latestPlan = studyPlans[0];
        studyPlanContext = `\n📋 PLAN DE ESTUDIOS (${latestPlan.academic_year} - Grado ${latestPlan.grade}):`;

        if (lowCompetencies.length > 0) {
          studyPlanContext += `\n⚠️ COMPETENCIAS CON NOTA BAJA (< 3.5):`;
          for (const lc of lowCompetencies.slice(0, 15)) {
            studyPlanContext += `\n  - ${lc.asignatura} → "${lc.competencia}" (Nota: ${lc.nota ?? 'Sin nota'}, ${lc.periodo})`;
          }
          if (lowCompetencies.length > 15) {
            studyPlanContext += `\n  ... y ${lowCompetencies.length - 15} más`;
          }
        } else {
          studyPlanContext += `\n✅ Todas las competencias están aprobadas (≥ 3.5)`;
        }

        // Add subject summary
        const subjectsWithLowGrades = allSubjects.filter(s => s.nota !== null && s.nota < 3.5);
        if (subjectsWithLowGrades.length > 0) {
          studyPlanContext += `\n📉 ASIGNATURAS CON NOTA BAJA:`;
          for (const s of subjectsWithLowGrades.slice(0, 10)) {
            studyPlanContext += `\n  - ${s.asignatura}: ${s.nota} (${s.periodo})`;
          }
        }
      }
    } catch (spError) {
      console.error('Error fetching study plans:', spError);
    }

    // Group progress by path
    const pathsWithProgress = pathProgress.reduce((acc: any, progress: any) => {
      const pathId = progress.path_id;
      if (!acc[pathId]) {
        acc[pathId] = {
          title: progress.learning_paths?.title || 'Sin título',
          total: 0,
          completed: 0
        };
      }
      acc[pathId].total++;
      if (progress.completed) {
        acc[pathId].completed++;
      }
      return acc;
    }, {});

    const activePathsCount = Object.keys(pathsWithProgress).length;
    const pathsSummary = Object.values(pathsWithProgress).slice(0, 3).map((p: any) => 
      `${p.title} (${p.completed}/${p.total})`
    ).join(', ');

    const userContext = `
Estudiante: ${profile?.full_name || 'Usuario'}
Nivel XP: ${profile?.experience_points || 0} puntos
Áreas de interés: ${profile?.areas_interes?.join(', ') || 'No especificadas'}

Rutas activas: ${activePathsCount > 0 ? `${activePathsCount} rutas - ${pathsSummary}${activePathsCount > 3 ? '...' : ''}` : 'Ninguna ruta activa'}

${vocationalProfile ? `Perfil Vocacional: ${vocationalProfile.summary.slice(0, 150)}...` : 'Sin perfil vocacional'}
${studyPlanContext}
`;

    const systemPrompt = `Eres SEDE AI, el asistente educativo inteligente de SEDEFY. Tu misión es maximizar el potencial de cada estudiante mediante recomendaciones personalizadas y guía estratégica.

🎯 TU PROPÓSITO PRINCIPAL:
- Analizar el rendimiento académico del estudiante y sugerir mejoras concretas
- Recomendar rutas de aprendizaje y contenido específico basado en sus necesidades
- Identificar áreas de oportunidad y fortalezas
- Motivar con feedback constructivo y celebrar logros
- Guiar en el desarrollo de habilidades y exploración vocacional
- Crear itinerarios de estudio personalizados cuando el usuario lo solicite

📊 REGLA OBLIGATORIA - ANÁLISIS DEL PLAN DE ESTUDIOS:
Revisa SIEMPRE el contexto del estudiante. Si hay competencias con nota baja (< 3.5) listadas abajo en "COMPETENCIAS CON NOTA BAJA", tu PRIMER PASO ante cualquier mensaje relacionado con estudio, recomendaciones, ayuda o mejora académica DEBE SER:
1. MENCIONAR las competencias y asignaturas específicas donde tiene notas bajas (usa los datos exactos del contexto)
2. EXPLICAR brevemente por qué esas competencias son importantes y qué significan las falencias
3. Luego, BUSCAR contenido en SEDEFY usando search_learning_paths y search_content con los NOMBRES DE LAS ASIGNATURAS con nota baja como términos de búsqueda
4. Si el estudiante dice "hola", "ayúdame", "qué me recomiendas", "cómo puedo mejorar", o cualquier saludo/petición general, SIEMPRE empieza analizando sus notas bajas

EJEMPLO DE COMPORTAMIENTO CORRECTO:
- Estudiante dice: "Hola, recomiéndame algo"
- Tú respondes: "Hola [nombre]! 📊 Revisé tu plan de estudios y veo que tienes algunas competencias que necesitan refuerzo: [listar competencias bajas con notas]. Te recomiendo enfocarte primero en [asignatura más débil]..."
- Y usas search_learning_paths con la asignatura débil como query
- Y usas search_content con la asignatura débil como query

🗺️ PRIORIDAD DE RECOMENDACIONES:
1. **PRIMERO** busca RUTAS DE APRENDIZAJE (search_learning_paths) - Son la forma más completa de aprender un tema
2. **DESPUÉS** busca CONTENIDO ESPECÍFICO (search_content) - Videos, quizzes, juegos y lecturas para complementar
3. Cuando hagas recomendaciones, SIEMPRE usa AMBAS herramientas para dar una respuesta más completa
4. Presenta primero las rutas y luego el contenido complementario (videos, quizzes, juegos, lecturas)
5. Los términos de búsqueda DEBEN basarse en las asignaturas y competencias con nota baja del estudiante

⚠️ REGLA CRÍTICA - NUNCA INVENTAR CONTENIDO:
- JAMÁS sugieras contenido, rutas o recursos que no hayas encontrado mediante las herramientas de búsqueda
- Si no encuentras resultados relevantes, díselo honestamente al usuario
- NO inventes títulos, descripciones o detalles de contenido
- SOLO menciona contenido que aparezca en los resultados de search_content o search_learning_paths
- Si los resultados de búsqueda están vacíos, NO hagas recomendaciones específicas de contenido, pero SÍ puedes explicar las falencias y dar consejos generales de estudio

📚 CUÁNDO USAR CADA HERRAMIENTA:

Usa generate_study_itinerary cuando:
- Usuario pida un "itinerario de estudio", "plan de estudio", "cronograma de aprendizaje"
- Diga: "hazme un itinerario", "quiero un plan para estudiar", "organiza mi estudio de [tema]"
- Necesite una estructura organizada para aprender un tema completo
- IMPORTANTE: Si el usuario pide un itinerario pero NO especifica el tema, PRIMERO pregúntale cuál es el tema que desea estudiar

Usa search_learning_paths cuando:
- Usuario quiera "estudiar [tema]" de forma completa
- Busque programas estructurados o cursos
- Necesite recomendaciones de aprendizaje amplias
- Diga: "quiero aprender", "necesito estudiar", "qué ruta me recomiendas"
- Detectes competencias bajas en su plan de estudios → busca con el NOMBRE DE LA ASIGNATURA
- SIEMPRE que recomiendes contenido, PRIMERO busca rutas

Usa search_content cuando:
- Usuario busque material específico: videos, quizzes, juegos, lecturas
- Diga: "muéstrame videos de", "quiero practicar con quizzes", "juegos de [tema]"
- Necesite recursos concretos para un tema específico
- Quieras sugerir contenido para reforzar competencias débiles → busca con el NOMBRE DE LA ASIGNATURA
- SIEMPRE búscalo SIN filtro de tipo para mostrar variedad (videos, quizzes, juegos, lecturas)

🧠 ANÁLISIS INTELIGENTE:
Siempre que el usuario pregunte por recomendaciones:
1. REVISA las competencias con nota baja del contexto
2. USA AMBAS HERRAMIENTAS DE BÚSQUEDA con los nombres de asignaturas débiles
3. Analiza los RESULTADOS REALES obtenidos
4. Recomienda SOLO del contenido encontrado
5. Presenta las rutas primero, luego el contenido complementario

Contexto del estudiante:
${userContext}

💡 DIRECTRICES DE COMUNICACIÓN:
- Respuestas concisas (2-3 líneas de texto descriptivo antes de las tarjetas)
- Usa el nombre del estudiante ocasionalmente para personalizar
- Celebra progreso y logros
- Sé específico con datos reales del usuario (menciona las notas y competencias exactas)
- Usa emojis estratégicamente
- Si no encuentras contenido: "No encontré [X] específico sobre ese tema, pero puedo buscar contenido relacionado"
- NO incluyas JSON ni datos estructurados en tu respuesta, solo texto conversacional
- Las tarjetas visuales se mostrarán automáticamente con portada y título
- Para itinerarios: presenta la información de forma clara y estructurada con emojis para cada sección`;

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
          description: "Busca rutas de aprendizaje completas en SEDEFY. Usa cuando el usuario busque programas estructurados o recomendaciones generales de estudio.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Términos de búsqueda para rutas"
              },
              category: {
                type: "string",
                description: "Categoría de la ruta (opcional)"
              },
              limit: {
                type: "number",
                description: "Número máximo de resultados (default: 8)"
              }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "search_content",
          description: "Busca contenido educativo específico (videos, quizzes, juegos, lecturas) en SEDEFY. USA cuando el usuario busque material educativo concreto como 'videos de', 'quizzes de', 'juegos de', 'lecturas sobre'.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Términos de búsqueda para contenido"
              },
              content_type: {
                type: "string",
                description: "Tipo de contenido: 'video', 'quiz', 'game', 'reading', o null para todos",
                enum: ["video", "quiz", "game", "reading", null]
              },
              limit: {
                type: "number",
                description: "Número máximo de resultados (default: 8)"
              }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "generate_study_itinerary",
          description: "Genera un itinerario de estudio estructurado para un tema específico. Usa cuando el usuario pida un plan de estudio, cronograma o itinerario de aprendizaje. El itinerario incluirá subtemas organizados con tiempos estimados y recursos sugeridos.",
          parameters: {
            type: "object",
            properties: {
              topic: {
                type: "string",
                description: "El tema principal que el usuario quiere estudiar"
              },
              duration_days: {
                type: "number",
                description: "Número de días para completar el itinerario (default: 7)"
              },
              hours_per_day: {
                type: "number",
                description: "Horas de estudio por día (default: 2)"
              },
              difficulty: {
                type: "string",
                description: "Nivel de dificultad: 'basico', 'intermedio', 'avanzado'",
                enum: ["basico", "intermedio", "avanzado"]
              }
            },
            required: ["topic"]
          }
        }
      }
    ];

    // Prepare user message with attachments
    let userMessageContent: any = message;
    
    if (attachments && attachments.length > 0) {
      // Build multimodal message for Gemini 2.5 Flash
      const contentParts: any[] = [{ type: "text", text: message }];
      
      for (const att of attachments) {
        if (att.type === 'image') {
          contentParts.push({
            type: "image_url",
            image_url: { url: att.url }
          });
        } else if (att.type === 'audio' || att.type === 'file') {
          contentParts.push({
            type: "text",
            text: `[Archivo adjunto: ${att.name || 'documento'}]`
          });
        }
      }
      
      userMessageContent = contentParts;
    }

    // First call to AI with tools
    const aiStartTime = Date.now();
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
          { 
            role: "user", 
            content: Array.isArray(userMessageContent) ? userMessageContent : [{ type: "text", text: userMessageContent }]
          }
        ],
        tools,
        temperature: 0.8,
      }),
    });

    console.log(`AI initial response in ${Date.now() - aiStartTime}ms`);

    if (!initialResponse.ok) {
      throw new Error(`AI gateway error: ${initialResponse.status}`);
    }

    const initialData = await initialResponse.json();
    const choice = initialData.choices?.[0];

    // Check if AI wants to use tools (handle multiple tool calls)
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      // Process all tool calls
      const toolResults: any[] = [];
      let allPathsInfo: any[] = [];
      let allContentInfo: any[] = [];
      let itineraryResult: any = null;

      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.function.name === "search_content") {
          const args = JSON.parse(toolCall.function.arguments);
          const searchQuery = args.query || "";
          const contentType = args.content_type;
          const limit = args.limit || 8;

          console.log('Searching content with query:', searchQuery, 'type:', contentType, 'limit:', limit);

          let results: any[] = [];

          // Search in content table (videos, readings)
          if (!contentType || contentType === 'video' || contentType === 'reading') {
            const typeFilter = contentType === 'video' ? 'video' : contentType === 'reading' ? 'reading' : null;
            
            let query = supabase
              .from('content')
              .select('id, title, description, thumbnail_url, content_type, category, subject, creator_id, profiles!content_creator_id_fkey(full_name, avatar_url)')
              .eq('is_public', true);

            if (typeFilter) {
              query = query.eq('content_type', typeFilter);
            }

            if (searchQuery) {
              const searchTerms = searchQuery.toLowerCase().split(' ').filter((t: string) => t.length > 2);
              const orConditions = searchTerms.map((term: string) => 
                `title.ilike.%${term}%,description.ilike.%${term}%,subject.ilike.%${term}%`
              ).join(',');
              if (orConditions) query = query.or(orConditions);
            }

            const { data } = await query.limit(limit);
            if (data) results.push(...data.map(c => ({ ...c, type_resolved: c.content_type })));
          }

          // Search quizzes
          if (!contentType || contentType === 'quiz') {
            let query = supabase
              .from('quizzes')
              .select('id, title, description, thumbnail_url, category, subject, creator_id, profiles!quizzes_creator_id_fkey(full_name, avatar_url)')
              .eq('is_public', true);

            if (searchQuery) {
              const searchTerms = searchQuery.toLowerCase().split(' ').filter((t: string) => t.length > 2);
              const orConditions = searchTerms.map((term: string) => 
                `title.ilike.%${term}%,description.ilike.%${term}%,subject.ilike.%${term}%`
              ).join(',');
              if (orConditions) query = query.or(orConditions);
            }

            const { data } = await query.limit(limit);
            if (data) results.push(...data.map(q => ({ ...q, type_resolved: 'quiz' })));
          }

          // Search games
          if (!contentType || contentType === 'game') {
            let query = supabase
              .from('games')
              .select('id, title, description, thumbnail_url, category, subject, creator_id, profiles!games_creator_id_fkey(full_name, avatar_url)')
              .eq('is_public', true);

            if (searchQuery) {
              const searchTerms = searchQuery.toLowerCase().split(' ').filter((t: string) => t.length > 2);
              const orConditions = searchTerms.map((term: string) => 
                `title.ilike.%${term}%,description.ilike.%${term}%,subject.ilike.%${term}%`
              ).join(',');
              if (orConditions) query = query.or(orConditions);
            }

            const { data } = await query.limit(limit);
            if (data) results.push(...data.map(g => ({ ...g, type_resolved: 'game' })));
          }

          results = results.slice(0, limit);
          console.log('Found content:', results.length);

          const contentInfo = results.map(c => {
            const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
            return {
              id: c.id,
              title: c.title,
              description: c.description,
              category: c.category,
              subject: c.subject,
              creator: profile?.full_name,
              cover_url: c.thumbnail_url,
              type: c.type_resolved
            };
          });

          allContentInfo.push(...contentInfo);
          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify({
              content: contentInfo,
              message: `Encontré ${contentInfo.length} contenidos relevantes.`
            })
          });
        }

        if (toolCall.function.name === "search_learning_paths") {
          const args = JSON.parse(toolCall.function.arguments);
          const searchQuery = args.query || "";
          const limit = args.limit || 8;

          console.log('Searching learning paths with query:', searchQuery, 'limit:', limit);

          let query = supabase
            .from('learning_paths')
            .select('id, title, description, cover_url, thumbnail_url, category, subject, tags, creator_id, profiles!learning_paths_creator_id_fkey(full_name, avatar_url)')
            .eq('is_public', true)
            .limit(limit);

          if (searchQuery) {
            const searchTerms = searchQuery.toLowerCase().split(' ').filter((t: string) => t.length > 2);
            const orConditions = searchTerms.map((term: string) => 
              `title.ilike.%${term}%,description.ilike.%${term}%,subject.ilike.%${term}%`
            ).join(',');
            if (orConditions) query = query.or(orConditions);
          }

          if (args.category) {
            query = query.eq('category', args.category);
          }

          const { data: paths, error: pathsError } = await query;
          if (pathsError) console.error('Error searching paths:', pathsError);

          console.log('Found paths:', paths?.length || 0);

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

          allPathsInfo.push(...pathsInfo);
          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify({
              paths: pathsInfo,
              message: `Encontré ${pathsInfo.length} rutas de aprendizaje relevantes.`
            })
          });
        }

        if (toolCall.function.name === "generate_study_itinerary") {
          const args = JSON.parse(toolCall.function.arguments);
          const topic = args.topic || "";
          const durationDays = args.duration_days || 7;
          const hoursPerDay = args.hours_per_day || 2;
          const difficulty = args.difficulty || "intermedio";

          console.log('Generating study itinerary for:', topic);

          const itineraryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { 
                  role: "system", 
                  content: `Eres un experto en diseño curricular y pedagogía. Tu tarea es crear itinerarios de estudio detallados y estructurados.

REGLAS:
- Genera un itinerario de estudio para el tema proporcionado
- El itinerario debe tener ${durationDays} días
- Cada día tiene aproximadamente ${hoursPerDay} horas de estudio
- Nivel de dificultad: ${difficulty}
- Divide el tema en subtemas lógicos y progresivos
- Incluye objetivos de aprendizaje para cada día
- Sugiere actividades prácticas cuando sea relevante
- Sé específico con los subtemas, no genérico

FORMATO DE RESPUESTA (JSON):
{
  "topic": "Tema principal",
  "total_days": número,
  "hours_per_day": número,
  "difficulty": "nivel",
  "overview": "Descripción breve del itinerario",
  "days": [
    {
      "day": 1,
      "title": "Título del día",
      "subtopics": ["Subtema 1", "Subtema 2"],
      "objectives": ["Objetivo 1", "Objetivo 2"],
      "activities": ["Actividad sugerida"],
      "estimated_hours": número
    }
  ],
  "final_project": "Descripción de un proyecto final opcional"
}`
                },
                { role: "user", content: `Crea un itinerario de estudio completo para: "${topic}"` }
              ],
              temperature: 0.7,
            }),
          });

          let itinerary = null;
          if (itineraryResponse.ok) {
            const itineraryData = await itineraryResponse.json();
            try {
              const content = itineraryData.choices?.[0]?.message?.content || "";
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) itinerary = JSON.parse(jsonMatch[0]);
            } catch (parseError) {
              console.error('Error parsing itinerary JSON:', parseError);
            }
          }

          itineraryResult = itinerary;
          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify({
              itinerary: itinerary,
              message: itinerary 
                ? `Itinerario generado para "${itinerary.topic}" con ${itinerary.total_days} días de estudio.`
                : `No se pudo generar el itinerario.`
            })
          });
        }
      }

      // Final call to AI with all tool results
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
            ...toolResults
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

      // Stream response with all data markers appended at end
      const reader = finalResponse.body!.getReader();
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                // Append paths marker (shown first - priority)
                if (allPathsInfo.length > 0) {
                  const marker = `\n\n|||PATHS_DATA:${JSON.stringify(allPathsInfo)}|||`;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: marker } }] })}\n\n`));
                }
                // Append content marker
                if (allContentInfo.length > 0) {
                  const marker = `\n\n|||CONTENT_DATA:${JSON.stringify(allContentInfo)}|||`;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: marker } }] })}\n\n`));
                }
                // Append itinerary marker
                if (itineraryResult) {
                  const marker = `\n\n|||ITINERARY_DATA:${JSON.stringify(itineraryResult)}|||`;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: marker } }] })}\n\n`));
                }
                controller.close();
                break;
              }
              controller.enqueue(value);
            }
          } catch (error) {
            controller.error(error);
          }
        }
      });

      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
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