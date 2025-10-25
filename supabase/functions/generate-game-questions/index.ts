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
    const { title, description, category, grade_level, gameType, numQuestions = 5 } = await req.json();
    
    if (!title || !category || !grade_level || !gameType) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY no configurada');
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (gameType === 'word_order') {
      systemPrompt = `Eres un experto creador de juegos educativos. Tu tarea es generar preguntas para el juego "Ordenar Palabras" donde los estudiantes deben construir oraciones correctas ordenando palabras desordenadas.

IMPORTANTE:
- Genera oraciones educativas y apropiadas para el nivel educativo
- Las oraciones deben tener entre 4 y 10 palabras
- Deben ser gramaticalmente correctas y con sentido claro
- Incluye una instrucción clara de lo que se pide`;

      userPrompt = `Genera ${numQuestions} preguntas del juego "Ordenar Palabras" para:

Título: ${title}
Descripción: ${description || 'Sin descripción'}
Asignatura: ${category}
Nivel educativo: ${grade_level}

Genera oraciones variadas y educativas apropiadas para este contexto.`;
    } else if (gameType === 'word_wheel') {
      systemPrompt = `Eres un experto creador de juegos educativos. Tu tarea es generar preguntas para el juego "Ruleta de Palabras" donde los estudiantes deben adivinar palabras basándose en definiciones y su letra inicial.

IMPORTANTE:
- Genera 26 preguntas, una por cada letra del alfabeto (A-Z)
- Cada pregunta debe tener una definición clara de la palabra
- La palabra correcta debe empezar con la letra correspondiente
- Las definiciones deben ser educativas y apropiadas para el nivel`;

      userPrompt = `Genera 26 preguntas del juego "Ruleta de Palabras" (una por cada letra A-Z) para:

Título: ${title}
Descripción: ${description || 'Sin descripción'}
Asignatura: ${category}
Nivel educativo: ${grade_level}

Genera una palabra y definición para cada letra del alfabeto, relacionadas con este tema.`;
    } else if (gameType === 'column_match') {
      systemPrompt = `Eres un experto creador de juegos educativos. Tu tarea es generar pares de items para el juego "Conectar Columnas" donde los estudiantes deben emparejar conceptos relacionados.

IMPORTANTE:
- Genera pares de conceptos relacionados lógicamente
- La columna izquierda puede ser: términos, preguntas, conceptos, países, etc.
- La columna derecha debe ser: definiciones, respuestas, ejemplos, capitales, etc.
- Los pares deben ser educativos y apropiados para el nivel`;

      userPrompt = `Genera ${numQuestions} pares de items del juego "Conectar Columnas" para:

Título: ${title}
Descripción: ${description || 'Sin descripción'}
Asignatura: ${category}
Nivel educativo: ${grade_level}

Genera pares de conceptos relacionados apropiados para este contexto.`;
    }

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
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_game_questions',
              description: 'Genera preguntas de juego estructuradas',
              parameters: gameType === 'word_order' ? {
                type: 'object',
                properties: {
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        question_text: {
                          type: 'string',
                          description: 'Instrucción de lo que debe hacer el estudiante'
                        },
                        correct_sentence: {
                          type: 'string',
                          description: 'La oración completa correcta'
                        },
                        words: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'Array de palabras de la oración (serán desordenadas)'
                        }
                      },
                      required: ['question_text', 'correct_sentence', 'words']
                    }
                  }
                },
                required: ['questions']
              } : gameType === 'word_wheel' ? {
                type: 'object',
                properties: {
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        initial_letter: {
                          type: 'string',
                          description: 'Letra inicial (A-Z)'
                        },
                        question_text: {
                          type: 'string',
                          description: 'Definición o pista de la palabra'
                        },
                        correct_sentence: {
                          type: 'string',
                          description: 'La palabra correcta'
                        }
                      },
                      required: ['initial_letter', 'question_text', 'correct_sentence']
                    }
                  }
                },
                required: ['questions']
              } : {
                type: 'object',
                properties: {
                  left_items: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Items de la columna izquierda'
                  },
                  right_items: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Items de la columna derecha (en el mismo orden que left_items)'
                  }
                },
                required: ['left_items', 'right_items']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_game_questions' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de peticiones excedido. Por favor intenta más tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Por favor agrega créditos en Settings -> Workspace -> Usage.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Error de IA:', response.status, errorText);
      throw new Error('Error al comunicarse con el servicio de IA');
    }

    const data = await response.json();
    console.log('Respuesta de IA:', JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'generate_game_questions') {
      throw new Error('No se recibieron preguntas de la IA');
    }

    const generatedData = JSON.parse(toolCall.function.arguments);
    
    if (gameType === 'column_match') {
      return new Response(
        JSON.stringify({ 
          left_items: generatedData.left_items,
          right_items: generatedData.right_items
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const formattedQuestions = generatedData.questions.map((q: any, index: number) => ({
        question_text: q.question_text,
        correct_sentence: q.correct_sentence,
        words: q.words || [],
        initial_letter: q.initial_letter || '',
        points: 10,
        order_index: index,
      }));

      return new Response(
        JSON.stringify({ questions: formattedQuestions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error en generate-game-questions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al generar preguntas';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
