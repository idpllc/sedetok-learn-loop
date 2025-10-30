import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category_id, prompt, count = 5 } = await req.json();

    if (!category_id || !prompt) {
      return new Response(
        JSON.stringify({ error: "category_id and prompt are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get category info
    const { data: category } = await supabase
      .from('trivia_categories')
      .select('*')
      .eq('id', category_id)
      .single();

    if (!category) {
      return new Response(
        JSON.stringify({ error: "Category not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Eres un experto en crear preguntas de trivia educativas y entretenidas.
Categoría: ${category.name} (${category.description})

INSTRUCCIONES ESTRICTAS:
- Genera EXACTAMENTE ${count} preguntas sobre: ${prompt}
- Cada pregunta debe tener EXACTAMENTE 4 opciones de respuesta
- Solo UNA opción debe ser correcta
- Las preguntas deben ser claras, precisas y apropiadas para la categoría
- Incluye una mezcla de dificultades (fácil, medio, difícil)
- Las respuestas incorrectas deben ser plausibles pero claramente distinguibles`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Genera ${count} preguntas de trivia siguiendo EXACTAMENTE este formato JSON:
[
  {
    "question_text": "¿Pregunta aquí?",
    "options": ["Opción 1", "Opción 2", "Opción 3", "Opción 4"],
    "correct_answer": 0,
    "difficulty": "medium",
    "points": 100
  }
]

IMPORTANTE:
- correct_answer debe ser el índice (0-3) de la respuesta correcta
- difficulty debe ser: "easy", "medium" o "hard"
- points: 100 para easy, 150 para medium, 200 para hard
- Responde SOLO con el array JSON, sin texto adicional` 
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_trivia_questions",
              description: "Generate trivia questions in the specified format",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_text: { type: "string" },
                        options: {
                          type: "array",
                          items: { type: "string" },
                          minItems: 4,
                          maxItems: 4
                        },
                        correct_answer: {
                          type: "integer",
                          minimum: 0,
                          maximum: 3
                        },
                        difficulty: {
                          type: "string",
                          enum: ["easy", "medium", "hard"]
                        },
                        points: { type: "integer" }
                      },
                      required: ["question_text", "options", "correct_answer", "difficulty", "points"]
                    }
                  }
                },
                required: ["questions"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_trivia_questions" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API Error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Error generating questions with AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    console.log('AI Response:', JSON.stringify(aiData));

    let questions = [];
    
    if (aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      const args = JSON.parse(aiData.choices[0].message.tool_calls[0].function.arguments);
      questions = args.questions;
    }

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No questions generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
