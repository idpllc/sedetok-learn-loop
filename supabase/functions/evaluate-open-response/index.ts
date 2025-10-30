import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { responseId, questionText, expectedAnswer, evaluationCriteria, userResponse } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build evaluation prompt
    const systemPrompt = `Eres un asistente de evaluación educativa. Tu trabajo es evaluar respuestas de estudiantes de manera justa y constructiva.

Debes proporcionar:
1. Una puntuación de 0 a 100
2. Retroalimentación específica y constructiva

Criterios de evaluación:
- Exactitud de la información
- Completitud de la respuesta
- Claridad y organización
- Uso apropiado de conceptos`;

    const userPrompt = `Pregunta: ${questionText}

${expectedAnswer ? `Respuesta esperada: ${expectedAnswer}` : ''}

${evaluationCriteria ? `Criterios específicos de evaluación:\n${evaluationCriteria}` : ''}

Respuesta del estudiante:
${userResponse}

Evalúa esta respuesta y proporciona tu evaluación en el siguiente formato JSON:
{
  "score": <número entre 0 y 100>,
  "feedback": "<retroalimentación constructiva en español>"
}`;

    // Call Lovable AI with tool calling for structured output
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "evaluate_response",
            description: "Evaluar la respuesta del estudiante",
            parameters: {
              type: "object",
              properties: {
                score: {
                  type: "number",
                  description: "Puntuación de 0 a 100",
                  minimum: 0,
                  maximum: 100
                },
                feedback: {
                  type: "string",
                  description: "Retroalimentación constructiva en español"
                }
              },
              required: ["score", "feedback"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "evaluate_response" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de solicitudes excedido, intenta más tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Se requiere pago. Agrega fondos a tu cuenta de Lovable AI.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error('Error al comunicarse con el servicio de IA');
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error('No se recibió una evaluación válida de la IA');
    }

    const evaluation = JSON.parse(toolCall.function.arguments);

    // Update the response in the database
    const { error: updateError } = await supabase
      .from('user_open_responses')
      .update({
        ai_score: evaluation.score,
        ai_feedback: evaluation.feedback,
        evaluated_at: new Date().toISOString(),
      })
      .eq('id', responseId);

    if (updateError) {
      console.error('Error updating response:', updateError);
      throw new Error('Error al guardar la evaluación');
    }

    return new Response(
      JSON.stringify({
        score: evaluation.score,
        feedback: evaluation.feedback,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in evaluate-open-response:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});