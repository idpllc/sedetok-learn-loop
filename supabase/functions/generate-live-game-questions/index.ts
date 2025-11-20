import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, gradeLevel, numberOfQuestions, difficulty } = await req.json();
    
    if (!topic || !gradeLevel || !numberOfQuestions) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos: topic, gradeLevel, numberOfQuestions" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY no está configurada");
    }

    console.log("Generando preguntas con IA:", { topic, gradeLevel, numberOfQuestions, difficulty });

    const systemPrompt = `Eres un experto en educación y creación de contenido pedagógico. Tu tarea es generar preguntas estilo Kahoot para juegos en vivo, optimizadas para ser divertidas, educativas y apropiadas para el nivel educativo especificado.`;

    const userPrompt = `Genera exactamente ${numberOfQuestions} preguntas de opción múltiple sobre el tema: "${topic}" para nivel educativo: ${gradeLevel}${difficulty ? `, con dificultad: ${difficulty}` : ''}.

Cada pregunta debe tener:
- Un texto de pregunta claro y educativo
- 4 opciones de respuesta
- Solo UNA respuesta correcta (indicada con el índice 0-3)
- Puntaje base de 1000 puntos
- Tiempo límite de 20 segundos

IMPORTANTE: Devuelve SOLO un JSON válido sin texto adicional, markdown o comentarios. El JSON debe seguir EXACTAMENTE esta estructura:

{
  "questions": [
    {
      "question_text": "¿Cuál es la capital de Francia?",
      "options": [
        { "text": "París" },
        { "text": "Londres" },
        { "text": "Madrid" },
        { "text": "Berlín" }
      ],
      "correct_answer": 0,
      "points": 1000,
      "time_limit": 20
    }
  ]
}

Asegúrate de que:
1. Las preguntas sean apropiadas para el nivel educativo ${gradeLevel}
2. Las opciones incorrectas sean plausibles pero claramente distinguibles de la correcta
3. El tema "${topic}" se explore desde diferentes ángulos
4. Cada pregunta sea autónoma y comprensible sin contexto adicional`;

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
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido, intenta más tarde" }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Se requiere pago, agrega fondos a tu workspace de Lovable AI" }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("Error de AI gateway:", response.status, errorText);
      throw new Error("Error del AI gateway");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("Respuesta vacía de IA:", data);
      throw new Error("No se recibió contenido de la IA");
    }

    console.log("Respuesta cruda de IA:", content);

    // Limpiar el contenido para extraer solo el JSON
    let jsonContent = content.trim();
    
    // Remover markdown code blocks si existen
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Intentar parsear el JSON
    let parsedData;
    try {
      parsedData = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error("Error al parsear JSON:", parseError);
      console.error("Contenido que causó el error:", jsonContent);
      throw new Error("La IA no devolvió un JSON válido");
    }

    // Validar estructura
    if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
      console.error("Estructura inválida:", parsedData);
      throw new Error("La respuesta de la IA no tiene la estructura correcta");
    }

    // Agregar order_index a cada pregunta
    const questionsWithIndex = parsedData.questions.map((q: any, index: number) => ({
      ...q,
      question_type: "multiple_choice",
      order_index: index,
    }));

    console.log("Preguntas generadas exitosamente:", questionsWithIndex.length);

    return new Response(
      JSON.stringify({ questions: questionsWithIndex }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error en generate-live-game-questions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
