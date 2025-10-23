import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profile, targetPosition, companyName, jobDescription } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Construir el prompt para la IA
    const systemPrompt = `Eres un experto en recursos humanos y creación de hojas de vida. 
Tu tarea es analizar el perfil profesional del usuario y generar una variación optimizada de su CV 
para una posición específica. Debes destacar las habilidades, experiencias y logros más relevantes 
para el cargo objetivo.

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin bloques de código) con esta estructura:
{
  "custom_bio": "Biografía personalizada en 2-3 líneas enfocada en el cargo",
  "highlighted_skills": ["habilidad1", "habilidad2", "habilidad3"],
  "highlighted_experience": ["experiencia destacada 1", "experiencia destacada 2"],
  "highlighted_projects": ["proyecto relevante 1", "proyecto relevante 2"],
  "key_achievements": ["logro 1", "logro 2", "logro 3"],
  "recommendations": "Breves recomendaciones sobre qué enfatizar en la entrevista"
}`;

    const userPrompt = `Perfil del candidato:
- Nombre: ${profile.full_name || "No especificado"}
- Biografía actual: ${profile.bio || "No especificada"}
- Institución: ${profile.institution || "No especificada"}
- Nivel educativo: ${profile.nivel_educativo || "No especificado"}
- Habilidades actuales: ${profile.skills?.map((s: any) => s.name).join(", ") || "No especificadas"}
- Experiencia laboral: ${profile.work_experience?.map((e: any) => `${e.position} en ${e.company}`).join(", ") || "No especificada"}
- Proyectos: ${profile.projects?.map((p: any) => p.name).join(", ") || "No especificados"}

Cargo objetivo: ${targetPosition}
${companyName ? `Empresa: ${companyName}` : ""}
${jobDescription ? `Descripción del puesto:\n${jobDescription}` : ""}

Genera una variación optimizada del CV enfocada en este cargo.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes alcanzado. Intenta de nuevo en unos momentos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes en Lovable AI. Por favor, recarga tu cuenta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Error al comunicarse con la IA");
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Limpiar la respuesta de posibles bloques de código markdown
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    
    const parsedContent = JSON.parse(cleanContent);

    return new Response(
      JSON.stringify({ variation: parsedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating CV variation:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});