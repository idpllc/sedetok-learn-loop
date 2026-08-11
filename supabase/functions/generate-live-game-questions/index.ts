import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/** Extrae el primer objeto JSON válido de un texto (tolera markdown y texto extra). */
function extractJson(raw: string): any | null {
  let text = (raw || "").trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  try {
    return JSON.parse(text);
  } catch (_) { /* continúa */ }

  const start = text.indexOf("{");
  if (start === -1) return null;

  // Recorre balanceando llaves (ignorando strings) para hallar el objeto completo
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch (_) {
          return null;
        }
      }
    }
  }
  return null;
}

function normalizeQuestions(rawQuestions: any[]): any[] {
  return rawQuestions
    .map((q: any) => {
      const questionText = String(q?.question_text ?? q?.question ?? "").trim();
      let options: Array<{ text: string; image_url: string }> = Array.isArray(q?.options)
        ? q.options.map((opt: any) => ({
            text: typeof opt === "string" ? opt : String(opt?.text ?? opt?.option_text ?? ""),
            image_url: "",
          }))
        : [];

      options = options.filter((o) => o.text.trim().length > 0).slice(0, 4);
      while (options.length < 4) options.push({ text: `Opción ${options.length + 1}`, image_url: "" });

      let correct = Number(q?.correct_answer);
      if (!Number.isInteger(correct) || correct < 0 || correct > 3) correct = 0;

      const points = Number(q?.points);
      const timeLimit = Number(q?.time_limit);

      return {
        question_text: questionText,
        question_type: "multiple_choice",
        options,
        correct_answer: correct,
        points: Number.isFinite(points) && points > 0 ? Math.round(points) : 1000,
        time_limit: Number.isFinite(timeLimit) && timeLimit >= 5 ? Math.round(timeLimit) : 20,
      };
    })
    .filter((q) => q.question_text.length > 0)
    .map((q, index) => ({ ...q, order_index: index }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { topic, gradeLevel, difficulty } = body ?? {};
    const numberOfQuestions = Math.min(Math.max(parseInt(String(body?.numberOfQuestions ?? "5"), 10) || 5, 1), 20);

    if (!topic || !gradeLevel) {
      return json({ error: "Faltan campos requeridos: topic, gradeLevel" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY no está configurada" }, 500);
    }

    console.log("Generando preguntas con IA:", { topic, gradeLevel, numberOfQuestions, difficulty });

    const systemPrompt = `Eres un experto en educación. Generas preguntas estilo Kahoot en JSON estricto, sin markdown ni texto adicional.`;

    const userPrompt = `Genera exactamente ${numberOfQuestions} preguntas de opción múltiple sobre el tema: "${topic}" para nivel educativo: ${gradeLevel}${difficulty ? `, con dificultad: ${difficulty}` : ''}.

Reglas:
- Cada pregunta tiene exactamente 4 opciones y una sola correcta (índice 0-3).
- points: 1000, time_limit: 20.
- Preguntas breves (máx. 120 caracteres) y opciones cortas (máx. 60 caracteres).
- Devuelve SOLO este JSON:
{"questions":[{"question_text":"...","options":[{"text":"..."},{"text":"..."},{"text":"..."},{"text":"..."}],"correct_answer":0,"points":1000,"time_limit":20}]}`;

    const callModel = async (model: string) => {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      return response;
    };

    let response = await callModel("google/gemini-3.5-flash");
    if (!response.ok && response.status !== 429 && response.status !== 402) {
      const firstError = await response.text();
      console.error("Fallo modelo principal:", response.status, firstError);
      response = await callModel("google/gemini-2.5-flash");
    }

    if (!response.ok) {
      if (response.status === 429) {
        return json({ error: "Límite de solicitudes excedido, intenta de nuevo en unos segundos" }, 429);
      }
      if (response.status === 402) {
        return json({ error: "Créditos de IA agotados. Recarga créditos para seguir generando preguntas." }, 402);
      }
      const errorText = await response.text();
      console.error("Error de AI gateway:", response.status, errorText);
      return json({ error: "El servicio de IA no está disponible en este momento. Intenta de nuevo." }, 502);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      console.error("Respuesta vacía de IA:", JSON.stringify(data).slice(0, 1000));
      return json({ error: "La IA no devolvió contenido. Intenta de nuevo." }, 502);
    }

    const parsed = extractJson(content);
    if (!parsed) {
      console.error("No se pudo parsear JSON. Contenido:", String(content).slice(0, 2000));
      return json({ error: "La IA devolvió un formato inválido. Intenta de nuevo." }, 502);
    }

    const rawQuestions = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      console.error("Estructura inválida:", JSON.stringify(parsed).slice(0, 1000));
      return json({ error: "La IA no generó preguntas válidas. Intenta con otro tema." }, 502);
    }

    const questions = normalizeQuestions(rawQuestions).slice(0, numberOfQuestions);
    if (questions.length === 0) {
      return json({ error: "La IA no generó preguntas válidas. Intenta de nuevo." }, 502);
    }

    console.log("Preguntas generadas exitosamente:", questions.length);
    return json({ questions });
  } catch (error) {
    console.error("Error en generate-live-game-questions:", error);
    return json({ error: error instanceof Error ? error.message : "Error desconocido" }, 500);
  }
});
