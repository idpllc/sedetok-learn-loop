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
    const { title, description, category, grade_level, difficulty, numQuestions = 5, document_url } = await req.json();
    
    if (!title || !category || !grade_level || !difficulty) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch document content if provided
    let documentContent = '';
    if (document_url) {
      try {
        const docResponse = await fetch(document_url);
        if (!docResponse.ok) {
          console.error('Error al descargar el documento:', docResponse.status);
        } else {
          const contentType = docResponse.headers.get('content-type') || '';
          if (contentType.includes('text') || contentType.includes('json')) {
            documentContent = await docResponse.text();
          } else {
            // For binary files, get base64
            const arrayBuffer = await docResponse.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            documentContent = btoa(String.fromCharCode(...bytes));
          }
        }
      } catch (err) {
        console.error('Error al obtener el documento:', err);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY no configurada');
    }

    const systemPrompt = `Eres un experto creador de contenido educativo. Tu tarea es generar preguntas de quiz apropiadas y bien estructuradas basadas en el contexto proporcionado.

IMPORTANTE:
- Las preguntas deben ser claras, educativas y apropiadas para el nivel educativo
- Para opción múltiple: genera 4 opciones, solo una correcta
- Para verdadero/falso: genera la pregunta con una respuesta correcta (true o false)
- Para respuesta corta: genera la pregunta con la respuesta correcta esperada
- Los puntos deben ser proporcionales a la dificultad (5-20 puntos)
- Incluye retroalimentación educativa para respuestas correctas e incorrectas`;

    let userPrompt = `Genera ${numQuestions} preguntas de quiz para:

Título: ${title}
Descripción: ${description || 'Sin descripción'}
Asignatura: ${category}
Nivel educativo: ${grade_level}
Dificultad: ${difficulty}`;

    if (documentContent) {
      userPrompt += `\n\nDOCUMENTO DE REFERENCIA:
Analiza el siguiente documento y genera preguntas basadas en su contenido:

${documentContent.substring(0, 50000)}

IMPORTANTE: Las preguntas deben estar directamente relacionadas con el contenido del documento adjunto.`;
    } else {
      userPrompt += `\n\nGenera una mezcla de tipos de preguntas (opción múltiple, verdadero/falso, respuesta corta) apropiadas para este tema.`;
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
              name: 'generate_quiz_questions',
              description: 'Genera preguntas de quiz estructuradas',
              parameters: {
                type: 'object',
                properties: {
                  estimated_time_minutes: {
                    type: 'number',
                    description: 'Tiempo estimado en minutos para completar el quiz (considera 1-2 min por pregunta múltiple, 30 seg por verdadero/falso, 2-3 min por respuesta corta)'
                  },
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        question_type: {
                          type: 'string',
                          enum: ['multiple_choice', 'true_false', 'short_answer'],
                          description: 'Tipo de pregunta'
                        },
                        question_text: {
                          type: 'string',
                          description: 'Texto de la pregunta'
                        },
                        points: {
                          type: 'number',
                          description: 'Puntos que vale la pregunta (5-20)'
                        },
                        feedback_correct: {
                          type: 'string',
                          description: 'Retroalimentación cuando la respuesta es correcta'
                        },
                        feedback_incorrect: {
                          type: 'string',
                          description: 'Retroalimentación cuando la respuesta es incorrecta'
                        },
                        options: {
                          type: 'array',
                          description: 'Opciones de respuesta (para multiple_choice y true_false)',
                          items: {
                            type: 'object',
                            properties: {
                              option_text: {
                                type: 'string',
                                description: 'Texto de la opción'
                              },
                              is_correct: {
                                type: 'boolean',
                                description: 'Si esta opción es la correcta'
                              }
                            },
                            required: ['option_text', 'is_correct']
                          }
                        },
                        correct_answer: {
                          type: 'string',
                          description: 'Respuesta correcta esperada (para short_answer)'
                        },
                        comparison_mode: {
                          type: 'string',
                          enum: ['exact', 'flexible'],
                          description: 'Modo de comparación para respuestas cortas'
                        }
                      },
                      required: ['question_type', 'question_text', 'points', 'feedback_correct', 'feedback_incorrect']
                    }
                  }
                },
                required: ['questions', 'estimated_time_minutes']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_quiz_questions' } }
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

    // Extraer las preguntas del tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'generate_quiz_questions') {
      throw new Error('No se recibieron preguntas de la IA');
    }

    const generatedQuestions = JSON.parse(toolCall.function.arguments);
    
    // Transformar las preguntas al formato esperado por el frontend
    const formattedQuestions = generatedQuestions.questions.map((q: any, index: number) => {
      const baseQuestion = {
        id: `ai-${Date.now()}-${index}`,
        question_type: q.question_type,
        question_text: q.question_text,
        points: q.points,
        feedback_correct: q.feedback_correct,
        feedback_incorrect: q.feedback_incorrect,
      };

      if (q.question_type === 'multiple_choice') {
        return {
          ...baseQuestion,
          options: q.options.map((opt: any, optIndex: number) => ({
            id: `opt-${Date.now()}-${index}-${optIndex}`,
            option_text: opt.option_text,
            is_correct: opt.is_correct,
            order_index: optIndex,
          })),
        };
      } else if (q.question_type === 'true_false') {
        return {
          ...baseQuestion,
          options: q.options.map((opt: any, optIndex: number) => ({
            id: `opt-${Date.now()}-${index}-${optIndex}`,
            option_text: opt.option_text,
            is_correct: opt.is_correct,
            order_index: optIndex,
          })),
        };
      } else if (q.question_type === 'short_answer') {
        return {
          ...baseQuestion,
          comparison_mode: q.comparison_mode || 'flexible',
          options: [{
            id: `opt-${Date.now()}-${index}-0`,
            option_text: q.correct_answer || '',
            is_correct: true,
            order_index: 0,
          }],
        };
      }
      
      return baseQuestion;
    });

    return new Response(
      JSON.stringify({ 
        questions: formattedQuestions,
        estimated_time_minutes: generatedQuestions.estimated_time_minutes || Math.ceil(numQuestions * 1.5)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en generate-quiz-questions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al generar preguntas';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
