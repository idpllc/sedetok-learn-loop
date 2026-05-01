import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { topic } = await req.json();

    if (!topic || typeof topic !== "string" || topic.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Tema inválido (mínimo 3 caracteres)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Lovable AI no configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Eres un experto en crear mapas mentales educativos. Devuelve SIEMPRE JSON válido.
Estructura:
{
  "root": {
    "title": "Tema principal",
    "description": "Descripción breve opcional",
    "children": [
      {
        "title": "Subtema 1",
        "description": "Descripción breve",
        "children": [
          { "title": "Detalle", "description": "", "children": [] }
        ]
      }
    ]
  }
}
Reglas:
- Genera entre 4 y 8 ramas principales (children del root).
- Cada rama principal puede tener entre 2 y 6 sub-nodos.
- Profundidad máxima: 3 niveles desde el root.
- Títulos cortos (máx 6 palabras).
- Descripciones de máximo 1 oración cuando ayuden.
- Idioma: español.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Crea un mapa mental educativo sobre: ${topic}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Demasiadas solicitudes. Intenta en un momento." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "Créditos de IA agotados." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!response.ok) {
      const txt = await response.text();
      console.error("AI gateway error:", txt);
      return new Response(
        JSON.stringify({ error: "Error de la IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const raw = aiResult?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    // Add UUIDs recursively
    const addIds = (n: any): any => ({
      id: crypto.randomUUID(),
      title: String(n?.title || "Nodo").slice(0, 200),
      description: String(n?.description || "").slice(0, 500),
      children: Array.isArray(n?.children) ? n.children.map(addIds) : [],
    });

    const root = parsed.root || parsed;
    const mindMap = { root: addIds(root) };

    return new Response(JSON.stringify({ mindMap }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("generate-mind-map error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Error inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
