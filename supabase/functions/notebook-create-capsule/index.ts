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
    const {
      notebookId,
      type,
      notebookSourceId,
      mode, // for type === "path": "metadata" (default) | "from_capsules"
      capsules, // [{id, type}] when mode === "from_capsules"
      generateCover, // boolean — generate AI cover image (path only)
      instructions, // free-text user instructions (presentation only)
    } = await req.json();
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

    // Sources are required for AI-grounded capsules, EXCEPT when building a path
    // from existing capsules (the capsules themselves are the grounding context).
    const isFromCapsules = type === "path" && mode === "from_capsules";
    if (!isFromCapsules && (!sources || sources.length === 0)) {
      return ERR("Añade al menos una fuente", 400);
    }

    // Build a compact context (limit total chars to keep prompt within budget)
    const MAX_TOTAL = 18000;
    let used = 0;
    const parts: string[] = [];
    for (const s of sources || []) {
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
        `${baseUserPrompt}Genera un quiz de selección múltiple con 8-10 preguntas basadas estrictamente en las fuentes. Cada pregunta debe tener exactamente 4 opciones (con prefijo "A. ", "B. ", "C. ", "D. ") y exactamente UNA opción marcada como is_correct=true. Asigna 10 puntos por pregunta. Incluye feedback breve para correcto e incorrecto.`,
        "create_quiz",
        params,
        apiKey,
        "google/gemini-2.5-pro"
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

    // ---------- GAME (AI decides type: column_match preferred, word_order si aplica) ----------
    else if (type === "game") {
      const params = {
        type: "object",
        properties: {
          ...META_PARAMS.properties,
          game_type: {
            type: "string",
            enum: ["column_match", "word_order"],
            description:
              "Tipo de juego más adecuado para las fuentes. Usa 'column_match' (Conectar Columnas) por defecto cuando el contenido tenga conceptos, definiciones, términos, fechas, eventos, países, capitales, causas/efectos, o cualquier información emparejable. Usa 'word_order' (Ordenar Palabras) SOLO cuando el contenido se preste claramente para construir oraciones gramaticales o secuencias lingüísticas (ej. idiomas, gramática, frases célebres).",
          },
          column_match: {
            type: "object",
            description: "Datos cuando game_type = 'column_match'. 6-8 pares.",
            properties: {
              left_items: { type: "array", items: { type: "string" }, description: "Items columna izquierda" },
              right_items: { type: "array", items: { type: "string" }, description: "Items columna derecha (mismo orden que left_items)" },
            },
          },
          word_order: {
            type: "object",
            description: "Datos cuando game_type = 'word_order'. 8 oraciones.",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question_text: { type: "string" },
                    correct_sentence: { type: "string", description: "Oración de 4-10 palabras" },
                  },
                  required: ["question_text", "correct_sentence"],
                },
              },
            },
          },
        },
        required: [...META_PARAMS.required, "game_type"],
      };

      const ai = await callAI(
        systemPrompt,
        `${baseUserPrompt}Decide el tipo de juego más adecuado para las fuentes. Prefiere "column_match" (Conectar Columnas) porque es más general y funciona con casi cualquier contenido (conceptos↔definiciones, términos↔ejemplos, etc.). Solo usa "word_order" cuando el contenido se preste claramente para ordenar palabras en oraciones. Devuelve los datos del tipo elegido.`,
        "create_game",
        params,
        apiKey
      );

      let chosenType: "column_match" | "word_order" = ai.game_type === "word_order" ? "word_order" : "column_match";

      // Fallback si IA eligió column_match pero no proveyó pares
      const cm = ai.column_match || {};
      const wo = ai.word_order || {};
      if (chosenType === "column_match" && (!Array.isArray(cm.left_items) || !Array.isArray(cm.right_items) || cm.left_items.length === 0)) {
        if (Array.isArray(wo.questions) && wo.questions.length > 0) chosenType = "word_order";
      }
      if (chosenType === "word_order" && (!Array.isArray(wo.questions) || wo.questions.length === 0)) {
        if (Array.isArray(cm.left_items) && Array.isArray(cm.right_items) && cm.left_items.length > 0) chosenType = "column_match";
      }

      const baseInsert: any = {
        creator_id: user.id,
        title: ai.title,
        description: ai.description,
        category: ai.category,
        grade_level: ai.grade_level,
        subject: ai.subject,
        tags: ai.tags || [],
        game_type: chosenType,
        time_limit: 120,
        is_public: true,
        status: "publicado",
      };

      if (chosenType === "column_match") {
        const lefts = (cm.left_items || []).map((t: any) => String(t || "").trim()).filter(Boolean);
        const rights = (cm.right_items || []).map((t: any) => String(t || "").trim()).filter(Boolean);
        const n = Math.min(lefts.length, rights.length);
        const leftColumnItems = Array.from({ length: n }, (_, i) => ({
          id: `left-${i}-${Date.now()}`,
          text: lefts[i],
          match_id: `match-${i}-${Date.now()}`,
        }));
        const rightColumnItems = leftColumnItems.map((l, i) => ({
          id: `right-${i}-${Date.now()}`,
          text: rights[i],
          match_id: l.match_id,
        }));
        baseInsert.left_column_items = leftColumnItems;
        baseInsert.right_column_items = rightColumnItems;
      }

      const { data: game, error: e1 } = await supabase
        .from("games")
        .insert(baseInsert)
        .select("id")
        .single();
      if (e1) throw e1;

      if (chosenType === "word_order") {
        const rows = (wo.questions || []).map((q: any, i: number) => {
          const sentence = String(q.correct_sentence || "").trim();
          const words = sentence ? sentence.split(/\s+/).filter(Boolean) : [];
          return {
            game_id: game.id,
            question_text: q.question_text,
            correct_sentence: sentence,
            words,
            points: 10,
            order_index: i,
          };
        }).filter((r: any) => r.correct_sentence);
        if (rows.length > 0) {
          const { error: eq } = await supabase.from("game_questions").insert(rows);
          if (eq) throw eq;
        }
      }

      result = { contentId: game.id, type: "game", route: `/?game=${game.id}`, title: ai.title, subject: ai.subject ?? null, cover_url: null };
    }

    // ---------- LEARNING PATH / COURSE ----------
    else if (type === "path" || type === "course") {
      // Helper: generate cover image via Lovable AI Gateway and upload to Cloudinary.
      const generateAndUploadCover = async (
        title: string,
        description: string,
        subject: string
      ): Promise<string | null> => {
        try {
          const imgPrompt = `Portada educativa profesional, estilo ilustración digital moderna y vibrante, sin texto. Tema: "${title}". Materia: ${subject}. Concepto visual: ${description}. Composición limpia con espacio negativo, paleta de colores armónica, alta calidad.`;
          const imgRes = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-image",
                messages: [{ role: "user", content: imgPrompt }],
                modalities: ["image", "text"],
              }),
            }
          );
          if (!imgRes.ok) {
            console.error("Image gen error", imgRes.status, await imgRes.text());
            return null;
          }
          const imgData = await imgRes.json();
          const imgUrl: string | undefined =
            imgData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (!imgUrl) return null;
          const base64 = imgUrl.includes(";base64,") ? imgUrl.split(";base64,")[1] : imgUrl;
          const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME")?.trim();
          const apiKeyCl = Deno.env.get("CLOUDINARY_API_KEY")?.trim();
          const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET")?.trim();
          if (!cloudName || !apiKeyCl || !apiSecret) {
            console.error("Cloudinary not configured for cover upload");
            return null;
          }
          const timestamp = Math.round(Date.now() / 1000);
          const folder = "sedefy/path_covers";
          const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
          const enc = new TextEncoder();
          const hash = await crypto.subtle.digest("SHA-1", enc.encode(paramsToSign + apiSecret));
          const signature = Array.from(new Uint8Array(hash))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          const fd = new FormData();
          fd.append("file", `data:image/png;base64,${base64}`);
          fd.append("api_key", apiKeyCl);
          fd.append("timestamp", String(timestamp));
          fd.append("folder", folder);
          fd.append("signature", signature);
          const upRes = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: "POST", body: fd }
          );
          if (!upRes.ok) {
            console.error("Cloudinary upload error", upRes.status, await upRes.text());
            return null;
          }
          const upJson = await upRes.json();
          return upJson.secure_url || upJson.url || null;
        } catch (e) {
          console.error("generateAndUploadCover error", e);
          return null;
        }
      };

      // ===== Mode: from_capsules =====
      if (type === "path" && mode === "from_capsules") {
        const inputCapsules: Array<{ id: string; type: string }> = Array.isArray(capsules) ? capsules : [];
        if (inputCapsules.length < 2) {
          return ERR("Necesitas al menos 2 cápsulas creadas en el notebook para construir una ruta.", 400);
        }

        const contentIds = inputCapsules.filter((c) => ["video", "reading", "mindmap"].includes(c.type)).map((c) => c.id);
        const quizIds = inputCapsules.filter((c) => c.type === "quiz").map((c) => c.id);
        const gameIds = inputCapsules.filter((c) => c.type === "game").map((c) => c.id);

        const [contentsRes, quizzesRes, gamesRes] = await Promise.all([
          contentIds.length
            ? supabase.from("content").select("id, title, description, content_type, subject").in("id", contentIds)
            : Promise.resolve({ data: [] as any[] }),
          quizIds.length
            ? supabase.from("quizzes").select("id, title, description, subject").in("id", quizIds)
            : Promise.resolve({ data: [] as any[] }),
          gameIds.length
            ? supabase.from("games").select("id, title, description, subject, game_type").in("id", gameIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const items: Array<{ id: string; type: string; title: string; description: string }> = [
          ...((contentsRes.data || []) as any[]).map((c) => ({
            id: c.id,
            type: c.content_type === "video" ? "video" : c.content_type === "mapa_mental" ? "mindmap" : "reading",
            title: c.title || "",
            description: c.description || "",
          })),
          ...((quizzesRes.data || []) as any[]).map((q) => ({
            id: q.id, type: "quiz", title: q.title || "", description: q.description || "",
          })),
          ...((gamesRes.data || []) as any[]).map((g) => ({
            id: g.id, type: "game", title: g.title || "", description: g.description || "",
          })),
        ];

        if (items.length < 2) {
          return ERR("No se encontraron suficientes cápsulas válidas para construir la ruta.", 400);
        }

        const params = {
          type: "object",
          properties: {
            ...META_PARAMS.properties,
            objectives: { type: "string", description: "Objetivos en HTML <ul><li>" },
            topic: { type: "string" },
            level: { type: "string", description: "Introductorio | Intermedio | Avanzado" },
            estimated_duration: { type: "integer", description: "Duración estimada en minutos (entero)" },
            ordered_items: {
              type: "array",
              description: "Cápsulas ordenadas pedagógicamente. Usa exactamente los IDs listados.",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  section_name: { type: "string", description: "Sección/módulo" },
                },
                required: ["id"],
              },
            },
          },
          required: [...META_PARAMS.required, "objectives", "topic", "level", "ordered_items"],
        };

        const itemsList = items
          .map((it, i) => `${i + 1}. [${it.type}] (id: ${it.id}) ${it.title} — ${it.description}`)
          .join("\n");

        const ai = await callAI(
          systemPrompt,
          `${baseUserPrompt}Construye una RUTA DE APRENDIZAJE coherente usando ÚNICAMENTE las cápsulas que el usuario ya creó en este notebook. Ordena los pasos pedagógicamente (de lo básico a lo avanzado) y agrúpalos en secciones lógicas. NO inventes IDs nuevos: usa exactamente los IDs listados.\n\nCápsulas disponibles:\n${itemsList}`,
          "build_path_from_capsules",
          params,
          apiKey
        );

        let coverUrl: string | null = null;
        if (generateCover) {
          coverUrl = await generateAndUploadCover(ai.title, ai.description, ai.subject);
        }

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
            estimated_duration: Math.max(1, Math.round(Number(ai.estimated_duration) || 60)),
            is_public: true,
            status: "published",
            path_type: "ruta",
            cover_url: coverUrl,
          })
          .select("id")
          .single();
        if (error) throw error;

        const itemById = new Map(items.map((it) => [it.id, it]));
        const seen = new Set<string>();
        const ordered: Array<{ id: string; type: string; section_name?: string }> = [];
        for (const o of (ai.ordered_items || []) as Array<{ id: string; section_name?: string }>) {
          if (!o?.id || seen.has(o.id)) continue;
          const it = itemById.get(o.id);
          if (!it) continue;
          ordered.push({ id: it.id, type: it.type, section_name: o.section_name });
          seen.add(o.id);
        }
        for (const it of items) {
          if (!seen.has(it.id)) { ordered.push({ id: it.id, type: it.type }); seen.add(it.id); }
        }

        const rows = ordered.map((o, i) => {
          const row: any = {
            path_id: path.id,
            order_index: i,
            section_name: o.section_name || null,
            is_required: true,
            estimated_time_minutes: 5,
            xp_reward: 10,
          };
          if (o.type === "quiz") row.quiz_id = o.id;
          else if (o.type === "game") row.game_id = o.id;
          else row.content_id = o.id;
          return row;
        });

        if (rows.length > 0) {
          const { error: insErr } = await supabase.from("learning_path_content").insert(rows);
          if (insErr) throw insErr;
        }

        result = {
          contentId: path.id,
          type: "path",
          route: `/learning-paths/view/${path.id}`,
          title: ai.title,
          subject: ai.subject ?? null,
          cover_url: coverUrl,
        };
      } else {
        // ===== Default: metadata only =====
        const params = {
          type: "object",
          properties: {
            ...META_PARAMS.properties,
            objectives: { type: "string", description: "Objetivos en HTML <ul><li>" },
            topic: { type: "string" },
            level: { type: "string" },
            estimated_duration: { type: "integer", description: "Duración estimada en minutos (entero)" },
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

        let coverUrl: string | null = null;
        if (type === "path" && generateCover) {
          coverUrl = await generateAndUploadCover(ai.title, ai.description, ai.subject);
        }

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
            estimated_duration: Math.max(1, Math.round(Number(ai.estimated_duration) || 60)),
            is_public: true,
            status: "draft",
            path_type: type === "course" ? "curso" : "ruta",
            cover_url: coverUrl,
          })
          .select("id")
          .single();
        if (error) throw error;
        result = { contentId: path.id, type, route: `/learning-paths/view/${path.id}`, title: ai.title, subject: ai.subject ?? null, cover_url: coverUrl };
      }
    }

    // ---------- PRESENTATION (docente) ----------
    else if (type === "presentation") {
      // Verify the user is a teacher (via profile or institution membership)
      const { data: prof } = await supabase
        .from("profiles")
        .select("tipo_usuario")
        .eq("id", user.id)
        .maybeSingle();
      let isTeacher = prof?.tipo_usuario === "Docente";
      if (!isTeacher) {
        const { data: membership } = await supabase
          .from("institution_members")
          .select("member_role")
          .eq("user_id", user.id)
          .eq("status", "active")
          .in("member_role", ["teacher", "admin", "coordinator"])
          .limit(1);
        isTeacher = !!(membership && membership.length > 0);
      }
      if (!isTeacher) {
        return ERR("Solo los docentes pueden crear presentaciones.", 403);
      }

      const params = {
        type: "object",
        properties: {
          ...META_PARAMS.properties,
          slides: {
            type: "array",
            description: "Exactamente 10 diapositivas en orden pedagógico (portada, agenda, 7 contenido, conclusión).",
            items: {
              type: "object",
              properties: {
                layout: {
                  type: "string",
                  enum: ["title", "title_bullets", "two_column", "quote", "closing", "image_full", "image_left", "image_right"],
                  description: "Tipo de diapositiva. La 1ª debe ser 'title' y la última 'closing'. Usa 'image_left'/'image_right' para mostrar imagen al costado de bullets, 'image_full' para imagen grande con título superpuesto.",
                },
                title: { type: "string", description: "Título de la diapositiva" },
                subtitle: { type: "string", description: "Subtítulo o lema corto (opcional)" },
                bullets: {
                  type: "array",
                  items: { type: "string" },
                  description: "3-5 viñetas concisas (10-18 palabras cada una).",
                },
                left_column: { type: "array", items: { type: "string" } },
                right_column: { type: "array", items: { type: "string" } },
                quote: { type: "string" },
                quote_author: { type: "string" },
                speaker_notes: { type: "string", description: "2-4 oraciones para el docente." },
                image_prompt: {
                  type: "string",
                  description: "Prompt en INGLÉS para generar una imagen ilustrativa de la diapositiva (estilo profesional, sin texto). OBLIGATORIO para layouts image_*, opcional para otros si aporta valor visual.",
                },
              },
              required: ["layout", "title"],
            },
          },
        },
        required: [...META_PARAMS.required, "slides"],
      };

      const userInstructionsBlock = instructions && typeof instructions === "string" && instructions.trim()
        ? `\n\nINSTRUCCIONES ESPECÍFICAS DEL DOCENTE (priorízalas sobre defaults):\n"""${instructions.trim().slice(0, 2000)}"""\n`
        : "";

      const ai = await callAI(
        systemPrompt,
        `${baseUserPrompt}Genera EXACTAMENTE 10 diapositivas tipo PowerPoint para una clase, basadas estrictamente en las fuentes. Estructura: 1) Portada (title), 2) Agenda (title_bullets), 3-9) Desarrollo combinando 'title_bullets', 'two_column', 'image_left', 'image_right' e 'image_full' (alterna para variedad visual y máximo impacto), 10) Cierre (closing). La mayoría de diapositivas deben incluir un 'image_prompt' descriptivo en inglés (estilo: editorial educativo, ilustración digital limpia, sin texto, paleta armónica). Lenguaje claro, viñetas cortas. Incluye SIEMPRE speaker_notes.${userInstructionsBlock}`,
        "create_presentation",
        params,
        apiKey,
        "google/gemini-2.5-pro"
      );

      // Helper: generate image and upload to Cloudinary, returning a URL or null.
      const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME")?.trim();
      const cloudKey = Deno.env.get("CLOUDINARY_API_KEY")?.trim();
      const cloudSecret = Deno.env.get("CLOUDINARY_API_SECRET")?.trim();
      const cloudReady = !!(cloudName && cloudKey && cloudSecret);

      const generateSlideImage = async (prompt: string): Promise<string | null> => {
        try {
          const fullPrompt = `Educational illustration, professional clean digital art, no text, harmonious palette, vibrant but tasteful, ample negative space. Subject: ${prompt}`;
          const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              messages: [{ role: "user", content: fullPrompt }],
              modalities: ["image", "text"],
            }),
          });
          if (!imgRes.ok) {
            console.error("slide image gen error", imgRes.status);
            return null;
          }
          const imgData = await imgRes.json();
          const imgUrl: string | undefined = imgData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (!imgUrl) return null;
          const base64 = imgUrl.includes(";base64,") ? imgUrl.split(";base64,")[1] : imgUrl;
          if (!cloudReady) {
            // Fallback: return inline data URL (works but bloats DB).
            return `data:image/png;base64,${base64}`;
          }
          const timestamp = Math.round(Date.now() / 1000);
          const folder = "sedefy/presentation_slides";
          const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
          const enc = new TextEncoder();
          const hash = await crypto.subtle.digest("SHA-1", enc.encode(paramsToSign + cloudSecret));
          const signature = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
          const fd = new FormData();
          fd.append("file", `data:image/png;base64,${base64}`);
          fd.append("api_key", cloudKey!);
          fd.append("timestamp", String(timestamp));
          fd.append("folder", folder);
          fd.append("signature", signature);
          const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd });
          if (!upRes.ok) {
            console.error("slide image upload error", upRes.status);
            return `data:image/png;base64,${base64}`;
          }
          const upJson = await upRes.json();
          return upJson.secure_url || upJson.url || `data:image/png;base64,${base64}`;
        } catch (e) {
          console.error("generateSlideImage error", e);
          return null;
        }
      };

      // First, build slide skeleton (without images)
      const rawSlides = (Array.isArray(ai.slides) ? ai.slides : []).slice(0, 12);

      // Generate images in parallel (with concurrency cap of 4 to avoid rate limits)
      const slidesWithImages: any[] = new Array(rawSlides.length);
      const concurrency = 4;
      for (let i = 0; i < rawSlides.length; i += concurrency) {
        const batch = rawSlides.slice(i, i + concurrency);
        const results = await Promise.all(
          batch.map(async (s: any, idx: number) => {
            const wantsImage = !!s.image_prompt && String(s.image_prompt).trim().length > 0;
            const imgUrl = wantsImage ? await generateSlideImage(String(s.image_prompt)) : null;
            return { slide: s, imgUrl, absoluteIdx: i + idx };
          })
        );
        for (const r of results) slidesWithImages[r.absoluteIdx] = r;
      }

      const slides = slidesWithImages.map((entry, i) => {
        const s = entry.slide;
        return {
          id: crypto.randomUUID(),
          order: i,
          layout: s.layout || "title_bullets",
          title: String(s.title || "").slice(0, 200),
          subtitle: s.subtitle ? String(s.subtitle).slice(0, 200) : null,
          bullets: Array.isArray(s.bullets) ? s.bullets.map((b: any) => String(b).slice(0, 300)) : [],
          left_column: Array.isArray(s.left_column) ? s.left_column.map((b: any) => String(b).slice(0, 300)) : [],
          right_column: Array.isArray(s.right_column) ? s.right_column.map((b: any) => String(b).slice(0, 300)) : [],
          quote: s.quote ? String(s.quote).slice(0, 500) : null,
          quote_author: s.quote_author ? String(s.quote_author).slice(0, 120) : null,
          speaker_notes: s.speaker_notes ? String(s.speaker_notes).slice(0, 1200) : null,
          image_prompt: s.image_prompt ? String(s.image_prompt).slice(0, 500) : null,
          image_url: entry.imgUrl,
        };
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
          content_type: "presentacion",
          presentation_data: { slides, theme: "default", instructions: instructions || null },
          is_public: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      result = {
        contentId: row.id,
        type: "presentation",
        route: `/presentation/${row.id}`,
        title: ai.title,
        subject: ai.subject ?? null,
        cover_url: slides[0]?.image_url ?? null,
      };
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
