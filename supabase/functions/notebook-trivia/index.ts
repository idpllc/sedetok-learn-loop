// Notebook Trivia: single endpoint, action-based.
// Actions:
//  - resolve_topic    { notebookId } -> { topic, generated }
//  - join_or_create   { topicKey, notebookId? } -> { room, players }
//  - leave            { roomId }
//  - start            { roomId } -> advances to in_progress, sets q1
//  - next_question    { roomId } -> host advances
//  - submit_answer    { roomId, position, selectedIndex, timeMs } -> { isCorrect, points }
//  - finish           { roomId }
//  - get_questions    { roomId } -> questions WITHOUT correct_index (host gets them too; truth checked server-side)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OK = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const ERR = (m: string, status = 400) => OK({ error: m }, status);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const slugify = (s: string) =>
  stripAccents(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "tema";

async function callAITool(systemPrompt: string, userPrompt: string, toolName: string, parameters: any, model = "google/gemini-2.5-flash") {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      tools: [{ type: "function", function: { name: toolName, description: "Result", parameters } }],
      tool_choice: { type: "function", function: { name: toolName } },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("AI error", res.status, t);
    throw new Error(`ai-${res.status}`);
  }
  const data = await res.json();
  const tc = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc?.function?.arguments) throw new Error("ai-no-tool-call");
  return JSON.parse(tc.function.arguments);
}

const TOPIC_PARAMS = {
  type: "object",
  properties: {
    title: { type: "string", description: "Título corto del tema central, máx 80 chars" },
    subject: { type: "string", description: "Asignatura/área (ej: 'Biología', 'Historia de Colombia')" },
    topic_slug: { type: "string", description: "Slug en español sin tildes, lowercase, separado por guiones, máx 50 chars (ej: 'celula-eucariota-organelos')" },
    summary: { type: "string", description: "Resumen del tema en 2-3 oraciones (máx 400 chars)" },
  },
  required: ["title", "subject", "topic_slug", "summary"],
  additionalProperties: false,
};

const QUESTIONS_PARAMS = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      minItems: 20,
      maxItems: 20,
      items: {
        type: "object",
        properties: {
          question: { type: "string", description: "Pregunta clara, máx 200 chars" },
          options: {
            type: "array",
            minItems: 4, maxItems: 4,
            items: { type: "string", description: "Opción de respuesta, máx 100 chars" },
          },
          correct_index: { type: "integer", minimum: 0, maximum: 3 },
          explanation: { type: "string", description: "Explicación breve de la respuesta correcta" },
        },
        required: ["question", "options", "correct_index", "explanation"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
};

async function getUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const sb = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const token = auth.replace("Bearer ", "");
  const { data, error } = await sb.auth.getClaims(token);
  if (error || !data?.claims) return null;
  return { id: data.claims.sub as string };
}

function svc() {
  return createClient(SUPABASE_URL, SERVICE_KEY);
}

async function ensureTopic(notebookId: string) {
  const s = svc();
  const { data: nb } = await s.from("notebooks").select("title, description").eq("id", notebookId).maybeSingle();
  const { data: sources } = await s
    .from("notebook_sources")
    .select("title, extracted_text")
    .eq("notebook_id", notebookId)
    .limit(20);

  const sourceText = (sources || [])
    .map((s: any) => `# ${s.title}\n${(s.extracted_text || "").slice(0, 2000)}`)
    .join("\n\n")
    .slice(0, 12000);

  const userPrompt =
    `Cuaderno: ${nb?.title || "(sin título)"}\nDescripción: ${nb?.description || "(sin descripción)"}\n\nFuentes:\n${sourceText || "(sin fuentes)"}\n\nIdentifica el tema central que está estudiando este estudiante.`;

  const result = await callAITool(
    "Eres un tutor que identifica con precisión el tema de estudio. Responde sólo en español. El topic_slug debe ser estable: refleja la materia + tema (ej: 'biologia-celula-eucariota'). Mantén el slug muy general para permitir emparejar con otros estudiantes del mismo tema.",
    userPrompt,
    "set_topic",
    TOPIC_PARAMS
  );

  const topic_key = slugify(`${result.subject || ""}-${result.topic_slug || result.title}`);

  const s2 = svc();
  const { data: existing } = await s2
    .from("notebook_trivia_topics")
    .select("*")
    .eq("topic_key", topic_key)
    .maybeSingle();

  if (existing) return existing;

  const { data: inserted, error } = await s2
    .from("notebook_trivia_topics")
    .insert({
      topic_key,
      title: result.title.slice(0, 120),
      subject: result.subject?.slice(0, 80) || null,
      description: result.summary?.slice(0, 600) || null,
      source_summary: sourceText.slice(0, 2000),
    })
    .select()
    .single();
  if (error) throw error;
  return inserted;
}

async function ensureQuestions(topic: any) {
  const s = svc();
  const { count } = await s
    .from("notebook_trivia_questions")
    .select("id", { count: "exact", head: true })
    .eq("topic_key", topic.topic_key);
  if ((count || 0) >= 20) return;

  const userPrompt =
    `Tema: ${topic.title}\nMateria: ${topic.subject || "general"}\nResumen: ${topic.description || ""}\n\nGenera EXACTAMENTE 20 preguntas de trivia tipo opción múltiple (4 opciones cada una, 1 correcta). Variadas en dificultad. Sin repetir conceptos. Español neutro. Cada pregunta autocontenida.`;

  const result = await callAITool(
    "Eres un experto en pedagogía que crea preguntas de trivia educativas, claras y precisas. Las opciones deben ser plausibles. La explicación debe ser breve y didáctica. Responde sólo en español.",
    userPrompt,
    "create_questions",
    QUESTIONS_PARAMS
  );

  const rows = (result.questions || []).slice(0, 20).map((q: any, i: number) => ({
    topic_key: topic.topic_key,
    position: i + 1,
    question: String(q.question || "").slice(0, 500),
    options: (q.options || []).slice(0, 4).map((o: any) => String(o).slice(0, 200)),
    correct_index: Math.max(0, Math.min(3, Number(q.correct_index) || 0)),
    explanation: q.explanation ? String(q.explanation).slice(0, 600) : null,
  }));

  if (rows.length < 20) throw new Error("ai-not-enough-questions");

  const { error } = await s.from("notebook_trivia_questions").insert(rows);
  if (error && !String(error.message).includes("duplicate")) throw error;
}

async function joinOrCreateRoom(userId: string, topic: any, notebookId: string | null) {
  const s = svc();
  // Look for waiting room with capacity for the same topic_key
  const { data: rooms } = await s
    .from("notebook_trivia_rooms")
    .select("*, notebook_trivia_room_players(id)")
    .eq("topic_key", topic.topic_key)
    .eq("status", "waiting")
    .order("created_at", { ascending: true });

  let target = (rooms || []).find((r: any) => (r.notebook_trivia_room_players?.length || 0) < r.max_players);

  if (!target) {
    const { data: created, error } = await s
      .from("notebook_trivia_rooms")
      .insert({ topic_key: topic.topic_key, notebook_id: notebookId, host_user_id: userId })
      .select()
      .single();
    if (error) throw error;
    target = created;
  }

  // Get profile snapshot
  const { data: prof } = await s.from("profiles").select("full_name, username, avatar_url").eq("id", userId).maybeSingle();
  const display_name = prof?.full_name || prof?.username || "Estudiante";

  // Insert player (idempotent)
  await s
    .from("notebook_trivia_room_players")
    .insert({ room_id: target.id, user_id: userId, display_name, avatar_url: prof?.avatar_url || null })
    .then(() => null)
    .catch(() => null);

  const { data: players } = await s
    .from("notebook_trivia_room_players")
    .select("*")
    .eq("room_id", target.id)
    .order("joined_at");

  const { data: freshRoom } = await s.from("notebook_trivia_rooms").select("*").eq("id", target.id).single();

  return { room: freshRoom, players: players || [] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return ERR("Unauthorized", 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;
    if (!action) return ERR("missing action");

    const s = svc();

    if (action === "resolve_topic") {
      const notebookId = body.notebookId;
      if (!notebookId) return ERR("missing notebookId");
      const topic = await ensureTopic(notebookId);
      await ensureQuestions(topic);
      return OK({ topic });
    }

    if (action === "join_or_create") {
      const topicKey = body.topicKey;
      if (!topicKey) return ERR("missing topicKey");
      const { data: topic } = await s.from("notebook_trivia_topics").select("*").eq("topic_key", topicKey).maybeSingle();
      if (!topic) return ERR("topic-not-found", 404);
      await ensureQuestions(topic);
      const { room, players } = await joinOrCreateRoom(user.id, topic, body.notebookId || null);
      return OK({ room, players, topic });
    }

    if (action === "leave") {
      const roomId = body.roomId;
      if (!roomId) return ERR("missing roomId");
      await s.from("notebook_trivia_room_players").delete().eq("room_id", roomId).eq("user_id", user.id);
      // If host left and room is waiting, delete or transfer
      const { data: room } = await s.from("notebook_trivia_rooms").select("*").eq("id", roomId).maybeSingle();
      if (room?.host_user_id === user.id && room.status === "waiting") {
        const { data: next } = await s
          .from("notebook_trivia_room_players")
          .select("user_id")
          .eq("room_id", roomId)
          .order("joined_at")
          .limit(1)
          .maybeSingle();
        if (next?.user_id) {
          await s.from("notebook_trivia_rooms").update({ host_user_id: next.user_id }).eq("id", roomId);
        } else {
          await s.from("notebook_trivia_rooms").delete().eq("id", roomId);
        }
      }
      return OK({ ok: true });
    }

    if (action === "start") {
      const roomId = body.roomId;
      const { data: room } = await s.from("notebook_trivia_rooms").select("*").eq("id", roomId).maybeSingle();
      if (!room) return ERR("room-not-found", 404);
      if (room.host_user_id !== user.id) return ERR("not-host", 403);
      if (room.status !== "waiting") return OK({ room });
      const { data: updated } = await s
        .from("notebook_trivia_rooms")
        .update({ status: "in_progress", current_question: 1, started_at: new Date().toISOString(), question_started_at: new Date().toISOString() })
        .eq("id", roomId)
        .select()
        .single();
      return OK({ room: updated });
    }

    if (action === "next_question") {
      const roomId = body.roomId;
      const { data: room } = await s.from("notebook_trivia_rooms").select("*").eq("id", roomId).maybeSingle();
      if (!room) return ERR("room-not-found", 404);
      if (room.host_user_id !== user.id) return ERR("not-host", 403);
      const next = (room.current_question || 0) + 1;
      if (next > 20) {
        const { data: finished } = await s
          .from("notebook_trivia_rooms")
          .update({ status: "finished", finished_at: new Date().toISOString() })
          .eq("id", roomId)
          .select()
          .single();
        return OK({ room: finished });
      }
      const { data: updated } = await s
        .from("notebook_trivia_rooms")
        .update({ current_question: next, question_started_at: new Date().toISOString() })
        .eq("id", roomId)
        .select()
        .single();
      return OK({ room: updated });
    }

    if (action === "submit_answer") {
      const { roomId, position, selectedIndex, timeMs } = body;
      if (!roomId || !position) return ERR("missing fields");
      const { data: room } = await s.from("notebook_trivia_rooms").select("*").eq("id", roomId).maybeSingle();
      if (!room) return ERR("room-not-found", 404);
      if (room.status !== "in_progress") return ERR("room-not-in-progress");
      if (room.current_question !== position) return ERR("wrong-question");

      const { data: q } = await s
        .from("notebook_trivia_questions")
        .select("correct_index")
        .eq("topic_key", room.topic_key)
        .eq("position", position)
        .maybeSingle();
      if (!q) return ERR("question-not-found", 404);

      const isCorrect = Number(selectedIndex) === q.correct_index;
      const tMs = Math.max(0, Math.min(15000, Number(timeMs) || 15000));
      const speedBonus = isCorrect ? Math.floor(((15000 - tMs) / 15000) * 50) : 0;
      const points = isCorrect ? 100 + speedBonus : 0;

      const { error: insErr } = await s.from("notebook_trivia_answers").insert({
        room_id: roomId,
        user_id: user.id,
        question_position: position,
        selected_index: selectedIndex,
        is_correct: isCorrect,
        time_ms: tMs,
        points,
      });
      if (insErr && !String(insErr.message).includes("duplicate")) throw insErr;

      // Update player score
      const { data: player } = await s
        .from("notebook_trivia_room_players")
        .select("score, correct_count")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (player) {
        await s
          .from("notebook_trivia_room_players")
          .update({
            score: (player.score || 0) + points,
            correct_count: (player.correct_count || 0) + (isCorrect ? 1 : 0),
          })
          .eq("room_id", roomId)
          .eq("user_id", user.id);
      }
      return OK({ isCorrect, points, correctIndex: q.correct_index });
    }

    if (action === "finish") {
      const roomId = body.roomId;
      const { data: room } = await s.from("notebook_trivia_rooms").select("*").eq("id", roomId).maybeSingle();
      if (!room) return ERR("room-not-found", 404);
      if (room.host_user_id !== user.id) return ERR("not-host", 403);
      const { data: finished } = await s
        .from("notebook_trivia_rooms")
        .update({ status: "finished", finished_at: new Date().toISOString() })
        .eq("id", roomId)
        .select()
        .single();
      return OK({ room: finished });
    }

    if (action === "get_questions") {
      const roomId = body.roomId;
      const { data: room } = await s.from("notebook_trivia_rooms").select("topic_key").eq("id", roomId).maybeSingle();
      if (!room) return ERR("room-not-found", 404);
      const { data: qs } = await s
        .from("notebook_trivia_questions")
        .select("position, question, options")
        .eq("topic_key", room.topic_key)
        .order("position");
      return OK({ questions: qs || [] });
    }

    return ERR("unknown action");
  } catch (e: any) {
    console.error("notebook-trivia error", e);
    return ERR(String(e?.message || e), 500);
  }
});
