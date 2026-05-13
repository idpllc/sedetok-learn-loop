// Notebook AI-powered Sedefy search.
// 1) Reads notebook sources (optionally a single source) as grounding.
// 2) Asks the AI to infer topic + semantic keywords (incl. synonyms in ES).
// 3) Fetches candidates from the relevant table using OR ilike on those keywords.
// 4) Asks the AI to rerank candidates against the topic and return ordered IDs with scores.
// 5) Returns the ranked items (sliced by offset/limit).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ERR = (message: string, status = 500) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const OK = (data: unknown) =>
  new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const callAITool = async (
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
  if (!tc?.function?.arguments) throw new Error("ai-no-tool-call");
  return JSON.parse(tc.function.arguments);
};

const TOPIC_PARAMS = {
  type: "object",
  properties: {
    topic: { type: "string", description: "Tema central de la fuente en 1 oración (máx 140 chars)" },
    subject_area: { type: "string", description: "Asignatura/área (ej: 'Biología celular', 'Historia de Colombia')" },
    keywords: {
      type: "array",
      items: { type: "string" },
      description:
        "8-15 palabras clave en español (sin tildes), incluyendo sinónimos y variantes relevantes. Solo términos sustantivos del tema. Sin stopwords.",
    },
  },
  required: ["topic", "subject_area", "keywords"],
};

const RANK_PARAMS = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          score: { type: "number", description: "0-100 relevancia con el tema" },
        },
        required: ["id", "score"],
      },
    },
  },
  required: ["results"],
};

const stripAccents = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Escape PostgREST `.or()` reserved chars inside an ilike value
const escForOr = (v: string) => v.replace(/[,()]/g, " ").trim();

const buildOr = (terms: string[]) =>
  terms
    .map((t) => escForOr(t))
    .filter((t) => t.length >= 3)
    .slice(0, 12)
    .map((t) => `title.ilike.%${t}%,description.ilike.%${t}%,subject.ilike.%${t}%`)
    .join(",");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return ERR("method-not-allowed", 405);

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return ERR("LOVABLE_API_KEY missing", 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const {
      notebookId,
      sourceId = null,
      type,
      offset = 0,
      limit = 3,
      readingSubtype = null,
    } = body || {};

    if (!notebookId || !type) return ERR("notebookId y type son requeridos", 400);

    // 1) Load sources
    let srcQ = supabase
      .from("notebook_sources")
      .select("title, extracted_text")
      .eq("notebook_id", notebookId)
      .eq("status", "ready");
    if (sourceId) srcQ = srcQ.eq("id", sourceId);
    const { data: sources, error: srcErr } = await srcQ;
    if (srcErr) return ERR(srcErr.message, 500);
    if (!sources || sources.length === 0) return OK({ results: [] });

    // Build a compact grounding context
    const context = sources
      .map((s: any, i: number) => {
        const title = (s.title || "").slice(0, 200);
        const text = (s.extracted_text || "").slice(0, 3500);
        return `# Fuente ${i + 1}: ${title}\n${text}`;
      })
      .join("\n\n")
      .slice(0, 14000);

    // 2) AI: topic + semantic keywords
    let topicData: { topic: string; subject_area: string; keywords: string[] };
    try {
      topicData = await callAITool(
        "Eres un experto en análisis temático académico. Identifica el tema central de las fuentes y produce palabras clave útiles para BÚSQUEDA en una base de contenido educativo en español. Las keywords deben ser sustantivos/términos específicos del tema, sin stopwords ni verbos genéricos como 'explica', 'tema', 'video'. Incluye sinónimos y variantes (singular y plural si aplica). Sin tildes.",
        `Fuentes del cuaderno:\n\n${context}\n\nIdentifica tema, asignatura y keywords.`,
        "topic_analysis",
        TOPIC_PARAMS,
        apiKey
      );
    } catch (e) {
      console.error("topic AI failed", e);
      return OK({ results: [] });
    }

    const keywords = (topicData.keywords || [])
      .map((k) => stripAccents(String(k)))
      .filter((k) => k && k.length >= 3);

    if (keywords.length === 0) return OK({ results: [] });

    const orFilter = buildOr(keywords);

    // 3) Fetch candidates depending on type
    const fetchLimit = 60;
    let candidates: any[] = [];

    if (type === "video" || type === "reading" || type === "mindmap") {
      let q = supabase
        .from("content")
        .select("id, title, description, thumbnail_url, content_type, subject, reading_type")
        .eq("is_public", true);

      if (type === "mindmap") q = q.eq("content_type", "mapa_mental");
      else if (type === "reading") {
        q = q.eq("content_type", "lectura");
        if (readingSubtype && readingSubtype !== "otro") {
          q = q.eq("reading_type", readingSubtype);
        } else if (readingSubtype === "otro") {
          q = q.or(
            "reading_type.is.null,and(reading_type.neq.resumen,reading_type.neq.glosario,reading_type.neq.notas)"
          );
        }
      } else {
        q = q.eq("content_type", "video");
      }
      if (orFilter) q = q.or(orFilter);
      const { data } = await q.limit(fetchLimit);
      candidates = (data || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        subject: c.subject,
        cover_url: c.thumbnail_url,
        type,
        readingSubtype: c.reading_type,
      }));
    } else if (type === "quiz") {
      let q = supabase
        .from("quizzes")
        .select("id, title, description, thumbnail_url, subject")
        .eq("is_public", true);
      if (orFilter) q = q.or(orFilter);
      const { data } = await q.limit(fetchLimit);
      candidates = (data || []).map((r: any) => ({
        id: r.id, title: r.title, description: r.description, subject: r.subject,
        cover_url: r.thumbnail_url, type: "quiz",
      }));
    } else if (type === "game") {
      let q = supabase
        .from("games")
        .select("id, title, description, thumbnail_url, subject")
        .eq("is_public", true);
      if (orFilter) q = q.or(orFilter);
      const { data } = await q.limit(fetchLimit);
      candidates = (data || []).map((r: any) => ({
        id: r.id, title: r.title, description: r.description, subject: r.subject,
        cover_url: r.thumbnail_url, type: "game",
      }));
    } else if (type === "path" || type === "course") {
      let q = supabase
        .from("learning_paths")
        .select("id, title, description, cover_url, thumbnail_url, subject")
        .eq("is_public", true);
      if (orFilter) q = q.or(orFilter);
      const { data } = await q.limit(fetchLimit);
      candidates = (data || []).map((r: any) => ({
        id: r.id, title: r.title, description: r.description, subject: r.subject,
        cover_url: r.cover_url || r.thumbnail_url, type,
      }));
    } else {
      return ERR("type inválido", 400);
    }

    if (candidates.length === 0) return OK({ results: [] });

    // 4) AI rerank — keep prompt compact
    const compact = candidates.slice(0, 50).map((c) => ({
      id: c.id,
      title: (c.title || "").slice(0, 140),
      subject: (c.subject || "").slice(0, 60),
      description: (c.description || "").slice(0, 240),
    }));

    let ranking: { results: { id: string; score: number }[] };
    try {
      ranking = await callAITool(
        "Eres un evaluador de relevancia educativa. Dado un TEMA y una lista de CANDIDATOS, asigna un score 0-100 indicando qué tan relevante es cada candidato para estudiar ese tema específico. Penaliza fuertemente los off-topic (score < 30). Devuelve TODOS los candidatos ordenados de mayor a menor score.",
        `TEMA: ${topicData.topic}\nASIGNATURA: ${topicData.subject_area}\nKEYWORDS: ${keywords.join(", ")}\n\nCANDIDATOS:\n${JSON.stringify(compact)}`,
        "rank_results",
        RANK_PARAMS,
        apiKey
      );
    } catch (e) {
      console.error("rank AI failed", e);
      // Fallback: return candidates as-is
      ranking = { results: compact.map((c) => ({ id: c.id, score: 50 })) };
    }

    const byId = new Map(candidates.map((c) => [c.id, c]));
    const ranked = (ranking.results || [])
      .filter((r) => byId.has(r.id) && r.score >= 40)
      .sort((a, b) => b.score - a.score)
      .map((r) => ({ ...byId.get(r.id), score: r.score }));

    const sliced = ranked.slice(offset, offset + limit);
    return OK({ results: sliced, topic: topicData.topic });
  } catch (e: any) {
    console.error("notebook-ai-search error", e);
    return ERR(e?.message || "internal", 500);
  }
});
