// Notebook → AI Capsule creator.
// Uses notebook sources as grounding context. AI infers title/category/grade/description.
// Persists the capsule with is_public=true and returns its route.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = [
  "matematicas", "ciencias", "lenguaje", "historia", "arte", "tecnologia", "otros",
];
const GRADES = [
  "preescolar", "primaria", "secundaria", "preparatoria", "universidad", "libre",
];

const ERR = (message: string, status = 500) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const callAI = async (
  systemPrompt: string,
  userPrompt: string,
  toolName: string,
  parameters: any,
  apiKey: string,
  model = "google/gemini-2.5-flash"
) => {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: { name: toolName, description: "Result", parameters },
        },
      ],
      tool_choice: { type: "function", function: { name: toolName } },
    }),
  });
  if (res.status === 429) throw new Error("rate-limited");
  if (res.status === 402) throw new Error("credits-exhausted");
  if (!res.ok) {
    const t = await res.text();
    console.error("AI error:", t);
    throw new Error("ai-error");
  }
  const data = await res.json();
  const tc = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc?.function?.arguments) {
    console.error("AI no devolvió tool_call. Respuesta completa:", JSON.stringify(data).slice(0, 2000));
    throw new Error("La IA no devolvió un resultado válido. Intenta de nuevo.");
  }
  try {
    return JSON.parse(tc.function.arguments);
  } catch (e) {
    console.error("AI devolvió JSON inválido:", tc.function.arguments?.slice(0, 1000));
    throw new Error("La IA devolvió un formato inválido. Intenta de nuevo.");
  }
};

const META_PARAMS = {
  type: "object",
  properties: {
    title: { type: "string", description: "Título corto y descriptivo (máx 90 chars)" },
    description: { type: "string", description: "Descripción de 1-2 oraciones (máx 280 chars)" },
    category: { type: "string", enum: CATEGORIES },
    grade_level: { type: "string", enum: GRADES },
    subject: { type: "string", description: "Asignatura específica (ej: 'Biología celular')" },
    tags: { type: "array", items: { type: "string" }, description: "3-6 etiquetas en minúsculas" },
  },
  required: ["title", "description", "category", "grade_level", "subject", "tags"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { notebookId, type, notebookSourceId } = await req.json();
    if (!notebookId || !type) return ERR("Faltan parámetros", 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return ERR("Lovable AI no configurado");

    // Auth context
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return ERR("No autenticado", 401);

    // Verify ownership
    const { data: notebook } = await supabase
      .from("notebooks")
      .select("id, title, user_id")
      .eq("id", notebookId)
      .maybeSingle();
    if (!notebook || notebook.user_id !== user.id) return ERR("Notebook no encontrado", 404);

    let srcQuery = supabase
      .from("notebook_sources")
      .select("title, extracted_text, source_type")
      .eq("notebook_id", notebookId)
      .eq("status", "ready");
    if (notebookSourceId) srcQuery = srcQuery.eq("id", notebookSourceId);
    const { data: sources } = await srcQuery;

    if (!sources || sources.length === 0) return ERR("Añade al menos una fuente", 400);

    // Build a compact context (limit total chars to keep prompt within budget)
    const MAX_TOTAL = 18000;
    let used = 0;
    const parts: string[] = [];
    for (const s of sources) {
      const header = `### ${s.title} [${s.source_type}]\n`;
      const body = (s.extracted_text || "").slice(0, 6000);
      const block = header + body + "\n\n";
      if (used + block.length > MAX_TOTAL) {
        parts.push(block.slice(0, MAX_TOTAL - used));
        break;
      }
      parts.push(block);
      used += block.length;
    }
    const context = parts.join("");

    const systemPrompt = `Eres un experto creador de contenido educativo. Generas cápsulas didácticas a partir de las fuentes proporcionadas. RESPONDE EN ESPAÑOL. Devuelve SIEMPRE datos válidos según el esquema solicitado. Inferir categoría, nivel, título y descripción a partir del contenido real de las fuentes (no inventes temas ajenos).`;

    const baseUserPrompt = `Contexto del cuaderno "${notebook.title}":\n\n${context}\n\n---\n`;

    let result: { contentId?: string; route: string; type: string; title?: string; subject?: string | null; cover_url?: string | null; readingSubtype?: string };

    // ---------- READING ----------
    if (type.startsWith("reading")) {
      const subtype = type === "reading-resumen" ? "resumen"
        : type === "reading-glosario" ? "glosario"
        : type === "reading-notas" ? "notas"
        : null;

      const styleHint =
        subtype === "resumen" ? "Genera un RESUMEN estructurado con introducción, secciones y conclusiones."
        : subtype === "glosario" ? "Genera un GLOSARIO con términos clave en negrita seguidos de su definición."
        : subtype === "notas" ? "Genera NOTAS de estudio con bullets, sub-bullets y puntos clave destacados."
        : "Genera una LECTURA tipo artículo educativo bien estructurado.";

      const params = {
        type: "object",
        properties: {
          ...META_PARAMS.properties,
          rich_text: { type: "string", description: "Contenido HTML enriquecido (h2, h3, p, ul, li, strong). 600-1500 palabras." },
        },
        required: [...META_PARAMS.required, "rich_text"],
      };

      const ai = await callAI(
        systemPrompt,
        `${baseUserPrompt}${styleHint}\nProduce metadata + el texto enriquecido en HTML.`,
        "create_reading",
        params,
        apiKey
      );

      const { data: row, error } = await supabase
        .from("content")
        .insert({
          creator_id: user.id,
          title: ai.title,
          description: ai.description,
          category: ai.category,
          grade_level: ai.grade_level,
          subject: ai.subject,
          tags: ai.tags || [],
          content_type: "lectura",
          reading_type: subtype,
          rich_text: ai.rich_text,
          is_public: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      result = { contentId: row.id, type: "reading", route: `/sedetok?content=${row.id}`, title: ai.title, subject: ai.subject ?? null, cover_url: null, readingSubtype: subtype };
    }

    // ---------- MIND MAP ----------
    else if (type === "mindmap") {
      const params = {
        type: "object",
        properties: {
          ...META_PARAMS.properties,
          mind_map: {
            type: "object",
            properties: {
              root: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  children: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        children: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              title: { type: "string" },
                              description: { type: "string" },
                            },
                            required: ["title"],
                          },
                        },
                      },
                      required: ["title"],
                    },
                  },
                },
                required: ["title"],
              },
            },
            required: ["root"],
          },
        },
        required: [...META_PARAMS.required, "mind_map"],
      };

      const ai = await callAI(
        systemPrompt,
        `${baseUserPrompt}Genera un mapa mental con 4-7 ramas principales y 2-5 sub-nodos cada una. Profundidad máx 3.`,
        "create_mindmap",
        params,
        apiKey
      );

      const addIds = (n: any): any => ({
        id: crypto.randomUUID(),
        title: String(n?.title || "Nodo").slice(0, 200),
        description: String(n?.description || "").slice(0, 500),
        children: Array.isArray(n?.children) ? n.children.map(addIds) : [],
      });

      const { data: row, error } = await supabase
        .from("content")
        .insert({
          creator_id: user.id,
          title: ai.title,
          description: ai.description,
          category: ai.category,
          grade_level: ai.grade_level,
          subject: ai.subject,
          tags: ai.tags || [],
          content_type: "mapa_mental",
          mind_map_data: { root: addIds(ai.mind_map.root) },
          is_public: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      result = { contentId: row.id, type: "mindmap", route: `/sedetok?content=${row.id}`, title: ai.title, subject: ai.subject ?? null, cover_url: null };
    }

    // ---------- QUIZ ----------
    else if (type === "quiz") {
      const params = {
        type: "object",
        properties: {
          ...META_PARAMS.properties,
          difficulty: { type: "string", enum: ["basico", "intermedio", "avanzado"] },
          questions: {
            type: "array",
            description: "8-10 preguntas",
            items: {
              type: "object",
              properties: {
                question_text: { type: "string" },
                points: { type: "number" },
                feedback_correct: { type: "string" },
                feedback_incorrect: { type: "string" },
                options: {
                  type: "array",
                  description: "Exactamente 4 opciones con prefijo 'A. ', 'B. ', 'C. ', 'D. '",
                  items: {
                    type: "object",
                    properties: {
                      option_text: { type: "string" },
                      is_correct: { type: "boolean" },
                    },
                    required: ["option_text", "is_correct"],
                  },
                },
              },
              required: ["question_text", "points", "options", "feedback_correct", "feedback_incorrect"],
            },
          },
        },
        required: [...META_PARAMS.required, "difficulty", "questions"],
      };

      const ai = await callAI(
        systemPrompt,
        `${baseUserPrompt}Genera un quiz de selección múltiple con 8-10 preguntas basadas estrictamente en las fuentes.`,
        "create_quiz",
        params,
        apiKey
      );

      const { data: quiz, error: e1 } = await supabase
        .from("quizzes")
        .insert({
          creator_id: user.id,
          title: ai.title,
          description: ai.description,
          category: ai.category,
          grade_level: ai.grade_level,
          subject: ai.subject,
          tags: ai.tags || [],
          difficulty: ai.difficulty || "intermedio",
          is_public: true,
          status: "publicado",
        })
        .select("id")
        .single();
      if (e1) throw e1;

      // Insert questions + options
      for (let i = 0; i < ai.questions.length; i++) {
        const q = ai.questions[i];
        const correctIdx = (q.options || []).findIndex((o: any) => o.is_correct);
        const { data: insertedQ, error: eq } = await supabase
          .from("quiz_questions")
          .insert({
            content_id: quiz.id,
            question_text: q.question_text,
            question_type: "multiple_choice",
            points: q.points || 10,
            order_index: i,
            options: {} as any,
            correct_answer: correctIdx >= 0 ? correctIdx : 0,
            feedback_correct: q.feedback_correct,
            feedback_incorrect: q.feedback_incorrect,
          })
          .select("id")
          .single();
        if (eq) throw eq;

        const optionsRows = (q.options || []).map((opt: any, j: number) => ({
          question_id: insertedQ.id,
          option_text: opt.option_text,
          is_correct: !!opt.is_correct,
          order_index: j,
        }));
        if (optionsRows.length > 0) {
          await supabase.from("quiz_options").insert(optionsRows);
        }
      }

      result = { contentId: quiz.id, type: "quiz", route: `/?quiz=${quiz.id}`, title: ai.title, subject: ai.subject ?? null, cover_url: null };
    }

    // ---------- GAME (word_order by default) ----------
    else if (type === "game") {
      const params = {
        type: "object",
        properties: {
          ...META_PARAMS.properties,
          questions: {
            type: "array",
            description: "8 preguntas. Cada una contiene una oración educativa de 4-10 palabras basada en las fuentes.",
            items: {
              type: "object",
              properties: {
                question_text: { type: "string", description: "Instrucción para el estudiante" },
                correct_sentence: { type: "string", description: "Oración completa" },
                words: { type: "array", items: { type: "string" } },
              },
              required: ["question_text", "correct_sentence", "words"],
            },
          },
        },
        required: [...META_PARAMS.required, "questions"],
      };

      const ai = await callAI(
        systemPrompt,
        `${baseUserPrompt}Genera un juego "Ordenar palabras" con 8 oraciones educativas extraídas de las fuentes.`,
        "create_game",
        params,
        apiKey
      );

      const { data: game, error: e1 } = await supabase
        .from("games")
        .insert({
          creator_id: user.id,
          title: ai.title,
          description: ai.description,
          category: ai.category,
          grade_level: ai.grade_level,
          subject: ai.subject,
          tags: ai.tags || [],
          game_type: "word_order",
          time_limit: 120,
          is_public: true,
          status: "publicado",
        })
        .select("id")
        .single();
      if (e1) throw e1;

      const rows = (ai.questions || []).map((q: any, i: number) => {
        const sentence = String(q.correct_sentence || "").trim();
        const words = sentence ? sentence.split(/\s+/).filter(Boolean) : (q.words || []);
        return {
          game_id: game.id,
          question_text: q.question_text,
          correct_sentence: sentence,
          words,
          points: 10,
          order_index: i,
        };
      });
      if (rows.length > 0) {
        const { error: eq } = await supabase.from("game_questions").insert(rows);
        if (eq) throw eq;
      }
      result = { contentId: game.id, type: "game", route: `/?game=${game.id}`, title: ai.title, subject: ai.subject ?? null, cover_url: null };
    }

    // ---------- LEARNING PATH / COURSE ----------
    else if (type === "path" || type === "course") {
      const params = {
        type: "object",
        properties: {
          ...META_PARAMS.properties,
          objectives: { type: "string", description: "Objetivos de aprendizaje (3-5 bullets en HTML <ul><li>)" },
          topic: { type: "string", description: "Tema central de la ruta" },
          level: { type: "string", description: "Nivel descriptivo (Introductorio, Intermedio, Avanzado)" },
          estimated_duration: { type: "number", description: "Duración estimada en minutos" },
        },
        required: [...META_PARAMS.required, "objectives", "topic", "level"],
      };

      const ai = await callAI(
        systemPrompt,
        `${baseUserPrompt}Genera la metadata de una ${type === "course" ? "curso" : "ruta de aprendizaje"} basada en las fuentes. El usuario añadirá los pasos manualmente luego.`,
        "create_path_meta",
        params,
        apiKey
      );

      const { data: path, error } = await supabase
        .from("learning_paths")
        .insert({
          creator_id: user.id,
          title: ai.title,
          description: ai.description,
          category: ai.category,
          grade_level: ai.grade_level,
          subject: ai.subject,
          topic: ai.topic,
          level: ai.level,
          tags: ai.tags || [],
          objectives: ai.objectives,
          estimated_duration: ai.estimated_duration || 60,
          is_public: true,
          status: "publicado",
          path_type: type === "course" ? "curso" : "ruta",
        })
        .select("id")
        .single();
      if (error) throw error;
      result = { contentId: path.id, type, route: `/learning-paths/view/${path.id}`, title: ai.title, subject: ai.subject ?? null, cover_url: null };
    }

    else {
      return ERR("Tipo no soportado", 400);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("notebook-create-capsule error:", err);
    const msg = err?.message === "rate-limited" ? "Demasiadas solicitudes. Intenta en un momento."
      : err?.message === "credits-exhausted" ? "Créditos de IA agotados."
      : err?.message || "Error inesperado";
    return ERR(msg, err?.message === "rate-limited" ? 429 : err?.message === "credits-exhausted" ? 402 : 500);
  }
});
