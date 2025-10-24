import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { areaMetrics, intelligenceMetrics, userProfile } = await req.json();
    
    console.log('Generating vocational profile for user:', userProfile);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Preparar el contexto del estudiante
    // Calcular nivel de confianza basado en cantidad de datos
    const calculateConfidence = () => {
      const totalQuizzes = Object.values(areaMetrics || {}).reduce((sum: number, m: any) => sum + m.totalQuizzes, 0);
      const totalVideos = Object.values(areaMetrics || {}).reduce((sum: number, m: any) => sum + m.videosWatched, 0);
      const totalDataPoints = totalQuizzes + totalVideos;
      
      if (totalDataPoints >= 50) return { level: 'alto', percentage: 90, margin: 10 };
      if (totalDataPoints >= 30) return { level: 'medio-alto', percentage: 75, margin: 15 };
      if (totalDataPoints >= 15) return { level: 'medio', percentage: 60, margin: 20 };
      if (totalDataPoints >= 5) return { level: 'medio-bajo', percentage: 45, margin: 25 };
      return { level: 'bajo', percentage: 30, margin: 30 };
    };

    const confidence = calculateConfidence();

    const studentContext = `
Perfil del Estudiante:
- Edad: ${userProfile.edad || 'No especificada'}
- Nivel Educativo: ${userProfile.nivel_educativo || 'No especificado'}
- País: ${userProfile.pais || 'Colombia'}
- Áreas de Interés: ${userProfile.areas_interes?.join(', ') || 'No especificadas'}
- Temas Favoritos: ${userProfile.temas_favoritos?.join(', ') || 'No especificados'}

Nivel de Confianza del Análisis:
- Confianza: ${confidence.level} (${confidence.percentage}%)
- Margen de error: ±${confidence.margin}%
- Basado en: ${Object.values(areaMetrics || {}).reduce((sum: number, m: any) => sum + m.totalQuizzes, 0)} quizzes y ${Object.values(areaMetrics || {}).reduce((sum: number, m: any) => sum + m.videosWatched, 0)} videos

Rendimiento Académico por Áreas:
${Object.entries(areaMetrics || {}).map(([area, metrics]: [string, any]) => 
  `- ${area}: ${metrics.averageScore}% promedio, ${metrics.totalQuizzes} quizzes completados, ${metrics.videosWatched} videos vistos`
).join('\n')}

Perfil de Inteligencias Múltiples:
${Object.entries(intelligenceMetrics || {}).map(([intelligence, metrics]: [string, any]) => 
  `- ${metrics.name}: ${metrics.averageScore}% desarrollo, ${metrics.totalQuizzes} evaluaciones`
).join('\n')}
`;

    const systemPrompt = `Eres un consejero vocacional experto que ayuda a estudiantes a descubrir carreras profesionales basándote en su perfil académico y de inteligencias múltiples.

Tu tarea es analizar el perfil del estudiante y generar recomendaciones personalizadas de carreras, incluyendo:
1. Carreras de investigación (pregrado y posgrado)
2. Carreras técnicas
3. Carreras tecnológicas

Para cada carrera recomendada, debes incluir:
- Nombre de la carrera
- Tipo (investigativa, técnica, tecnológica)
- Descripción breve (por qué se recomienda basado en el perfil)
- Nivel de coincidencia con el perfil (alto, medio)
- Universidades recomendadas en Colombia (mínimo 2)
- Universidades recomendadas internacionales (mínimo 2)
- Áreas de inteligencia que se desarrollan
- Oportunidades laborales

Genera entre 6 y 10 recomendaciones variadas que cubran diferentes tipos de carreras.`;

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
          { role: "user", content: studentContext }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_vocational_recommendations",
              description: "Genera recomendaciones vocacionales personalizadas",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        careerName: { type: "string", description: "Nombre de la carrera" },
                        careerType: { 
                          type: "string", 
                          enum: ["investigativa", "tecnica", "tecnologica"],
                          description: "Tipo de carrera" 
                        },
                        description: { type: "string", description: "Descripción y justificación" },
                        matchLevel: { 
                          type: "string", 
                          enum: ["alto", "medio"],
                          description: "Nivel de coincidencia" 
                        },
                        universitiesColombia: {
                          type: "array",
                          items: { type: "string" },
                          description: "Universidades en Colombia"
                        },
                        universitiesInternational: {
                          type: "array",
                          items: { type: "string" },
                          description: "Universidades internacionales"
                        },
                        relatedIntelligences: {
                          type: "array",
                          items: { type: "string" },
                          description: "Inteligencias que se desarrollan"
                        },
                        jobOpportunities: {
                          type: "array",
                          items: { type: "string" },
                          description: "Oportunidades laborales"
                        }
                      },
                      required: ["careerName", "careerType", "description", "matchLevel", "universitiesColombia", "universitiesInternational", "relatedIntelligences", "jobOpportunities"],
                      additionalProperties: false
                    }
                  },
                  summary: {
                    type: "string",
                    description: "Resumen general del perfil vocacional del estudiante"
                  },
                  confidence: {
                    type: "object",
                    properties: {
                      level: { 
                        type: "string", 
                        enum: ["alto", "medio-alto", "medio", "medio-bajo", "bajo"],
                        description: "Nivel de confianza del análisis" 
                      },
                      percentage: { type: "number", description: "Porcentaje de confianza" },
                      margin: { type: "number", description: "Margen de error en porcentaje" },
                      dataPoints: { type: "number", description: "Cantidad de datos analizados" }
                    },
                    required: ["level", "percentage", "margin", "dataPoints"]
                  }
                },
                required: ["recommendations", "summary", "confidence"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_vocational_recommendations" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Límite de solicitudes excedido. Por favor intenta de nuevo en unos momentos." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Se requiere agregar créditos. Por favor contacta al administrador." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI Response received");

    const toolCall = data.choices[0].message.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const vocationalProfile = JSON.parse(toolCall.function.arguments);
    
    // Asegurar que el nivel de confianza esté incluido
    if (!vocationalProfile.confidence) {
      vocationalProfile.confidence = confidence;
      vocationalProfile.confidence.dataPoints = 
        Object.values(areaMetrics || {}).reduce((sum: number, m: any) => sum + m.totalQuizzes, 0) + 
        Object.values(areaMetrics || {}).reduce((sum: number, m: any) => sum + m.videosWatched, 0);
    }

    return new Response(JSON.stringify(vocationalProfile), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Error in generate-vocational-profile function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Error generando perfil vocacional" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
