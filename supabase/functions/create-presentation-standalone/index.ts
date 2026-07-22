// Standalone Presentation generator (AI). Used by the "Crear" form so a
// teacher can generate a deck from topic + parameters, without needing a
// notebook. Mirrors the presentation branch of `notebook-create-capsule`
// but grounds the AI on the form fields instead of notebook sources.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { uploadBytesToS3, base64ToBytes } from "../_shared/s3-upload.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = ["matematicas", "ciencias", "lenguaje", "historia", "arte", "tecnologia", "otros"];
const GRADES = ["preescolar", "primaria", "secundaria", "preparatoria", "universidad", "libre"];

const ERR = (message: string, status = 500) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const callAI = async (
  systemPrompt: string,
  userPrompt: string,
  toolName: string,
  parameters: any,
  apiKey: string,
  model = "google/gemini-2.5-pro",
) => {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{ type: "function", function: { name: toolName, description: "Result", parameters } }],
      tool_choice: { type: "function", function: { name: toolName } },
    }),
  });
  if (res.status === 429) throw new Error("rate-limited");
  if (res.status === 402) throw new Error("credits-exhausted");
  if (!res.ok) {
    console.error("AI error:", await res.text());
    throw new Error("ai-error");
  }
  const data = await res.json();
  const tc = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc?.function?.arguments) throw new Error("La IA no devolvió un resultado válido.");
  return JSON.parse(tc.function.arguments);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      title,
      description,
      subject,
      category,
      grade_level,
      tags,
      presentation_type, // "slides" | "flashcards"
      language, // "es" | "en" | "pt" | "fr"
      class_duration_min, // number
      text_density, // "low" | "medium" | "high"
      instructions, // free text
    } = body || {};

    if (!title || typeof title !== "string") return ERR("Falta el título", 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return ERR("Lovable AI no configurado");

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return ERR("No autenticado", 401);

    // Teacher-only
    const { data: prof } = await supabase
      .from("profiles").select("tipo_usuario").eq("id", user.id).maybeSingle();
    let isTeacher = prof?.tipo_usuario === "Docente";
    if (!isTeacher) {
      const { data: m } = await supabase
        .from("institution_members")
        .select("member_role")
        .eq("user_id", user.id).eq("status", "active")
        .in("member_role", ["teacher", "admin", "coordinator"]).limit(1);
      isTeacher = !!(m && m.length > 0);
    }
    if (!isTeacher) return ERR("Solo los docentes pueden crear presentaciones.", 403);

    const kind: "slides" | "flashcards" = presentation_type === "flashcards" ? "flashcards" : "slides";
    const lang = ["en", "pt", "fr"].includes(language) ? language : "es";
    const duration = Math.max(5, Math.min(180, Number(class_duration_min) || 30));
    const density: "low" | "medium" | "high" = ["low", "medium", "high"].includes(text_density) ? text_density : "medium";

    // Slide count: flashcards always 10, slides scales with duration (≈1 slide/3min, capped 6-20)
    const slideCount = kind === "flashcards" ? 10 : Math.max(6, Math.min(20, Math.round(duration / 3)));

    const densityHint = density === "low"
      ? "Texto MÍNIMO: máx 3 viñetas de 6-10 palabras."
      : density === "high"
      ? "Texto DENSO: 4-6 viñetas detalladas de 14-22 palabras."
      : "Texto BALANCEADO: 3-5 viñetas de 10-16 palabras.";

    const langName = lang === "en" ? "English" : lang === "pt" ? "Português" : lang === "fr" ? "Français" : "Español";

    const cat = CATEGORIES.includes(category) ? category : "otros";
    const grade = GRADES.includes(grade_level) ? grade_level : "libre";
    const safeTags: string[] = Array.isArray(tags) ? tags.slice(0, 8).map((t) => String(t).slice(0, 30)) : [];

    const params = {
      type: "object",
      properties: {
        slides: {
          type: "array",
          description: `Exactamente ${slideCount} ${kind === "flashcards" ? "tarjetas de estudio" : "diapositivas"} en orden pedagógico.`,
          items: {
            type: "object",
            properties: {
              layout: {
                type: "string",
                enum: ["title", "section_header", "title_bullets", "two_column", "cards_2", "cards_3", "cards_4", "cards_image", "quote", "closing", "image_full", "image_left", "image_right"],
              },
              title: { type: "string" },
              subtitle: { type: "string" },
              bullets: { type: "array", items: { type: "string" } },
              left_column: { type: "array", items: { type: "string" } },
              right_column: { type: "array", items: { type: "string" } },
              cards: {
                type: "array",
                description: "Tarjetas para layouts cards_2, cards_3, cards_4 o cards_image (2-4 elementos).",
                items: {
                  type: "object",
                  properties: {
                    icon: { type: "string", description: "Nombre lucide: sparkles, lightbulb, book, beaker, atom, flask, microscope, leaf, sprout, tree, sun, droplet, flame, globe, heart, brain, eye, users, graduation, calculator, compass, palette, music, code, cpu, rocket, target, trophy, star, map, clock, zap, shield, dna, activity." },
                    title: { type: "string" },
                    body: { type: "string", description: "2-3 frases con **palabras clave en negrita**." },
                    image_prompt: { type: "string", description: "Solo para cards_image: prompt EN INGLÉS sin texto." },
                  },
                  required: ["title", "body"],
                },
              },
              quote: { type: "string" },
              quote_author: { type: "string" },
              speaker_notes: { type: "string" },
              image_prompt: { type: "string", description: "Prompt en INGLÉS para una imagen ilustrativa, sin texto." },
            },
            required: ["layout", "title"],
          },
        },
      },
      required: ["slides"],
    };

    const flashcardHint = kind === "flashcards"
      ? `Formato TARJETAS DE ESTUDIO 1:1 (cuadradas): cada slide es una tarjeta con un concepto clave (title), una definición o explicación corta (1-2 viñetas) y opcional image_prompt. Layouts permitidos: 'title_bullets' o 'image_full'. Sin diapositiva de cierre.`
      : `Formato DIAPOSITIVAS 16:9 RICAS: 1) Portada (title), 2) Agenda (title_bullets o cards_3), 3..${slideCount - 1}) Desarrollo. CRÍTICO: al menos el 50% de las diapositivas de desarrollo deben usar layouts de TARJETAS ('cards_3' principalmente, también 'cards_2', 'cards_4' o 'cards_image'). Cada tarjeta lleva: icon (de la lista permitida), title corto (2-4 palabras) y body de 2-3 frases con **palabras clave en negrita**. Combina con 'two_column', 'image_left/right', 'quote', 'section_header' como divisores. ${slideCount}) Cierre (closing). Para cards_image incluye image_prompt en INGLÉS por tarjeta. Para diapositivas con imagen completa incluye image_prompt en INGLÉS.`;

    const userInstructionsBlock = instructions && String(instructions).trim()
      ? `\n\nINSTRUCCIONES ESPECÍFICAS DEL DOCENTE (priorízalas):\n"""${String(instructions).trim().slice(0, 2000)}"""\n`
      : "";

    const systemPrompt = `Eres un experto creador de contenido educativo. Generas presentaciones didácticas. RESPONDE EN ${langName}. Devuelve SIEMPRE datos válidos según el esquema.`;

    const userPrompt = `Tema/Título: "${title}"\n` +
      (description ? `Descripción: ${description}\n` : "") +
      (subject ? `Asignatura: ${subject}\n` : "") +
      `Categoría: ${cat}\nNivel: ${grade}\nIdioma: ${langName}\nDuración estimada de clase: ${duration} min\n` +
      `Densidad de texto: ${density}. ${densityHint}\n\n` +
      `Genera EXACTAMENTE ${slideCount} ${kind === "flashcards" ? "tarjetas" : "diapositivas"}.\n${flashcardHint}\n` +
      `Incluye SIEMPRE speaker_notes (2-4 oraciones).${userInstructionsBlock}`;

    const ai = await callAI(systemPrompt, userPrompt, "create_presentation", params, apiKey);

    // Image generation (parallel, concurrency 4)
    const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME")?.trim();
    const cloudKey = Deno.env.get("CLOUDINARY_API_KEY")?.trim();
    const cloudSecret = Deno.env.get("CLOUDINARY_API_SECRET")?.trim();
    const cloudReady = !!(cloudName && cloudKey && cloudSecret);

    const generateSlideImage = async (prompt: string): Promise<string | null> => {
      try {
        const fullPrompt = `Educational illustration, professional clean digital art, no text, harmonious palette, vibrant but tasteful, ample negative space. Subject: ${prompt}`;
        const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: fullPrompt }],
            modalities: ["image", "text"],
          }),
        });
        if (!imgRes.ok) return null;
        const imgData = await imgRes.json();
        const imgUrl: string | undefined = imgData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!imgUrl) return null;
        const base64 = imgUrl.includes(";base64,") ? imgUrl.split(";base64,")[1] : imgUrl;
        if (!cloudReady) return `data:image/png;base64,${base64}`;
        const timestamp = Math.round(Date.now() / 1000);
        const folder = "sedefy/presentation_slides";
        const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
        const enc = new TextEncoder();
        const hash = await crypto.subtle.digest("SHA-1", enc.encode(paramsToSign + cloudSecret));
        const signature = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
        const fd = new FormData();
        fd.append("file", `data:image/png;base64,${base64}`);
        fd.append("api_key", cloudKey!);
        fd.append("timestamp", String(timestamp));
        fd.append("folder", folder);
        fd.append("signature", signature);
        const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd });
        if (!upRes.ok) return `data:image/png;base64,${base64}`;
        const upJson = await upRes.json();
        return upJson.secure_url || upJson.url || `data:image/png;base64,${base64}`;
      } catch (e) {
        console.error("generateSlideImage error", e);
        return null;
      }
    };

    const rawSlides = (Array.isArray(ai.slides) ? ai.slides : []).slice(0, slideCount + 2);

    // Build slides WITHOUT images first so we can return fast.
    const baseSlides = rawSlides.map((s: any, i: number) => ({
      id: crypto.randomUUID(),
      order: i,
      layout: s.layout || "title_bullets",
      title: String(s.title || "").slice(0, 200),
      subtitle: s.subtitle ? String(s.subtitle).slice(0, 200) : null,
      bullets: Array.isArray(s.bullets) ? s.bullets.map((b: any) => String(b).slice(0, 300)) : [],
      left_column: Array.isArray(s.left_column) ? s.left_column.map((b: any) => String(b).slice(0, 300)) : [],
      right_column: Array.isArray(s.right_column) ? s.right_column.map((b: any) => String(b).slice(0, 300)) : [],
      cards: Array.isArray(s.cards)
        ? s.cards.slice(0, 4).map((c: any) => ({
            icon: c?.icon ? String(c.icon).toLowerCase().slice(0, 30) : null,
            title: String(c?.title || "").slice(0, 120),
            body: String(c?.body || "").slice(0, 400),
            image_url: null,
            image_prompt: c?.image_prompt ? String(c.image_prompt).slice(0, 500) : null,
          }))
        : [],
      quote: s.quote ? String(s.quote).slice(0, 500) : null,
      quote_author: s.quote_author ? String(s.quote_author).slice(0, 120) : null,
      speaker_notes: s.speaker_notes ? String(s.speaker_notes).slice(0, 1200) : null,
      image_prompt: s.image_prompt ? String(s.image_prompt).slice(0, 500) : null,
      image_url: null,
    }));

    const { data: row, error } = await supabase
      .from("content")
      .insert({
        creator_id: user.id,
        title: String(title).slice(0, 200),
        description: description ? String(description).slice(0, 500) : null,
        category: cat,
        grade_level: grade,
        subject: subject ? String(subject).slice(0, 120) : null,
        tags: safeTags,
        content_type: "presentacion",
        presentation_data: {
          slides: baseSlides,
          theme: "teal",
          instructions: instructions || null,
          images_status: "generating",
          meta: {
            type: kind,
            language: lang,
            class_duration_min: duration,
            text_density: density,
            theme: "teal",
          },
        },
        is_public: true,
      })
      .select("id")
      .single();
    if (error) throw error;

    // Backfill images in the background so the client gets a fast response.
    const backfillImages = async () => {
      try {
        const enriched: any[] = new Array(baseSlides.length);
        const concurrency = 4;
        for (let i = 0; i < baseSlides.length; i += concurrency) {
          const batch = baseSlides.slice(i, i + concurrency);
          const results = await Promise.all(batch.map(async (s: any, idx: number) => {
            const wantsImage = !!s.image_prompt && String(s.image_prompt).trim().length > 0;
            const imgUrl = wantsImage ? await generateSlideImage(String(s.image_prompt)) : null;
            const cards = await Promise.all((s.cards || []).map(async (c: any) => {
              const wantsCardImg = s.layout === "cards_image" && c?.image_prompt;
              const cImg = wantsCardImg ? await generateSlideImage(String(c.image_prompt)) : null;
              return { ...c, image_url: cImg };
            }));
            return { ...s, image_url: imgUrl, cards, absoluteIdx: i + idx };
          }));
          for (const r of results) enriched[r.absoluteIdx] = r;
        }
        const finalSlides = enriched.map(({ absoluteIdx, ...rest }) => rest);
        await supabase
          .from("content")
          .update({
            presentation_data: {
              slides: finalSlides,
              theme: "teal",
              instructions: instructions || null,
              images_status: "ready",
              meta: {
                type: kind,
                language: lang,
                class_duration_min: duration,
                text_density: density,
                theme: "teal",
              },
            },
          })
          .eq("id", row.id);
      } catch (e) {
        console.error("backfillImages error:", e);
        await supabase
          .from("content")
          .update({
            presentation_data: {
              slides: baseSlides,
              theme: "teal",
              instructions: instructions || null,
              images_status: "failed",
              meta: {
                type: kind,
                language: lang,
                class_duration_min: duration,
                text_density: density,
                theme: "teal",
              },
            },
          })
          .eq("id", row.id);
      }
    };

    // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(backfillImages());
    } else {
      backfillImages();
    }

    return new Response(JSON.stringify({
      contentId: row.id,
      route: `/presentation/${row.id}/edit`,
      title: String(title),
      cover_url: null,
      images_status: "generating",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("create-presentation-standalone error:", err);
    const msg = err?.message === "rate-limited" ? "Demasiadas solicitudes. Intenta en un momento."
      : err?.message === "credits-exhausted" ? "Créditos de IA agotados."
      : err?.message || "Error inesperado";
    return ERR(msg, err?.message === "rate-limited" ? 429 : err?.message === "credits-exhausted" ? 402 : 500);
  }
});
