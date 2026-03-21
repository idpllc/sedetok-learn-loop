import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, category, grade_level, gameType, numQuestions = 5 } = await req.json();
    
    console.log('Request received:', { title, description, category, grade_level, gameType, numQuestions });

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
    let toolParameters: any = {};

    if (gameType === 'word_order') {
      systemPrompt = `Eres un experto creador de juegos educativos en español. Tu tarea es generar preguntas para el juego "Ordenar Palabras" donde los estudiantes deben construir oraciones correctas ordenando palabras desordenadas.

REGLAS:
- Genera oraciones educativas y apropiadas para el nivel educativo indicado
- Las oraciones deben tener entre 4 y 10 palabras
- Deben ser gramaticalmente correctas y con sentido claro
- El array "words" debe contener EXACTAMENTE las mismas palabras que "correct_sentence", separadas por espacios
- Incluye una instrucción clara de lo que se pide en question_text`;

      userPrompt = `Genera ${numQuestions} preguntas del juego "Ordenar Palabras" para:

Título: ${title}
Descripción: ${description || 'Sin descripción'}
Asignatura: ${category}
Nivel educativo: ${grade_level}

Genera oraciones variadas y educativas apropiadas para este contexto.`;

      toolParameters = {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question_text: { type: 'string', description: 'Instrucción de lo que debe hacer el estudiante' },
                correct_sentence: { type: 'string', description: 'La oración completa correcta' },
                words: { type: 'array', items: { type: 'string' }, description: 'Array de palabras individuales de la oración' }
              },
              required: ['question_text', 'correct_sentence', 'words'],
              additionalProperties: false
            }
          }
        },
        required: ['questions'],
        additionalProperties: false
      };
    } else if (gameType === 'word_wheel') {
      systemPrompt = `Eres un experto creador de juegos educativos en español. Tu tarea es generar preguntas para el juego "Ruleta de Palabras" (estilo Pasapalabra).

REGLAS ESTRICTAS:
- Genera EXACTAMENTE 26 preguntas, una por cada letra del alfabeto español: A, B, C, D, E, F, G, H, I, J, K, L, M, N, Ñ, O, P, Q, R, S, T, U, V, W, X, Y, Z
- Si no se usa Ñ, genera 27 con las 26 letras estándar A-Z
- Cada pregunta debe tener:
  - initial_letter: la letra mayúscula (A, B, C, etc.)
  - question_text: una definición o pista clara que describe la palabra
  - correct_sentence: la palabra correcta que DEBE empezar con esa letra
- Las palabras deben estar relacionadas con la asignatura y tema indicados
- Las definiciones deben ser claras y apropiadas para el nivel educativo
- Para letras difíciles (W, X, Y), usa palabras que CONTENGAN esa letra si no existe una que empiece con ella, pero indica "Contiene la letra X:" en la pista`;

      userPrompt = `Genera 26 preguntas del juego "Ruleta de Palabras" (una por cada letra A-Z) para:

Título: ${title}
Descripción: ${description || 'Sin descripción'}
Asignatura/Tema: ${category}
Nivel educativo: ${grade_level}

IMPORTANTE: Todas las palabras y definiciones deben estar directamente relacionadas con "${title}" y la asignatura "${category}". 
Por ejemplo, si el título es "La célula" y la asignatura es "Biología", la letra A podría ser "ADN", la B "Biosíntesis", etc.

Genera una palabra y definición para CADA una de las 26 letras del alfabeto.`;

      toolParameters = {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            description: 'Array de exactamente 26 preguntas, una por cada letra A-Z',
            items: {
              type: 'object',
              properties: {
                initial_letter: { type: 'string', description: 'Letra mayúscula del alfabeto (A-Z)' },
                question_text: { type: 'string', description: 'Definición o pista para adivinar la palabra' },
                correct_sentence: { type: 'string', description: 'La palabra correcta que empieza con esa letra' }
              },
              required: ['initial_letter', 'question_text', 'correct_sentence'],
              additionalProperties: false
            }
          }
        },
        required: ['questions'],
        additionalProperties: false
      };
    } else if (gameType === 'column_match') {
      systemPrompt = `Eres un experto creador de juegos educativos en español. Tu tarea es generar pares de items para el juego "Conectar Columnas" donde los estudiantes deben emparejar conceptos relacionados.

REGLAS:
- Genera pares de conceptos relacionados lógicamente
- La columna izquierda puede ser: términos, preguntas, conceptos, países, etc.
- La columna derecha debe ser: definiciones, respuestas, ejemplos, capitales, etc.
- Los pares deben ser educativos y apropiados para el nivel
- left_items[0] se conecta con right_items[0], left_items[1] con right_items[1], etc.`;

      userPrompt = `Genera ${numQuestions} pares de items del juego "Conectar Columnas" para:

Título: ${title}
Descripción: ${description || 'Sin descripción'}
Asignatura: ${category}
Nivel educativo: ${grade_level}

Genera pares de conceptos relacionados apropiados para este contexto.`;

      toolParameters = {
        type: 'object',
        properties: {
          left_items: { type: 'array', items: { type: 'string' }, description: 'Items de la columna izquierda' },
          right_items: { type: 'array', items: { type: 'string' }, description: 'Items de la columna derecha (en el mismo orden que left_items)' }
        },
        required: ['left_items', 'right_items'],
        additionalProperties: false
      };
    }

    console.log('Calling AI gateway with gameType:', gameType);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
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
              parameters: toolParameters
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_game_questions' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de peticiones excedido. Por favor intenta más tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Error del servicio de IA: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received, choices:', data.choices?.length);

    // Try tool_calls first, then fall back to parsing content
    let generatedData: any = null;

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.function?.arguments) {
      try {
        generatedData = JSON.parse(toolCall.function.arguments);
        console.log('Parsed from tool_calls successfully');
      } catch (parseErr) {
        console.error('Failed to parse tool_calls arguments:', parseErr);
      }
    }

    // Fallback: try to extract JSON from message content
    if (!generatedData) {
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        console.log('Trying to parse from message content');
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            generatedData = JSON.parse(jsonMatch[0]);
          }
        } catch (parseErr) {
          console.error('Failed to parse content as JSON:', parseErr);
        }
      }
    }

    if (!generatedData) {
      console.error('Full AI response:', JSON.stringify(data, null, 2));
      throw new Error('No se pudieron extraer las preguntas de la respuesta de IA');
    }
    
    if (gameType === 'column_match') {
      return new Response(
        JSON.stringify({ 
          left_items: generatedData.left_items,
          right_items: generatedData.right_items
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const questions = generatedData.questions || [];
      const formattedQuestions = questions.map((q: any, index: number) => ({
        question_text: q.question_text || '',
        correct_sentence: q.correct_sentence || '',
        words: q.words || [],
        initial_letter: (q.initial_letter || '').toUpperCase(),
        points: 10,
        order_index: index,
      }));

      console.log(`Returning ${formattedQuestions.length} formatted questions`);

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
