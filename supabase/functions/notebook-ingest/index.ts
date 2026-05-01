import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_TEXT = 60_000; // chars per source

async function extractWithGemini(fileUrl: string, mimeHint: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing');

  // Download file as base64
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) throw new Error(`No se pudo descargar el archivo (${fileRes.status})`);
  const buf = new Uint8Array(await fileRes.arrayBuffer());
  let binary = '';
  for (let i = 0; i < buf.byteLength; i++) binary += String.fromCharCode(buf[i]);
  const b64 = btoa(binary);
  const dataUrl = `data:${mimeHint};base64,${b64}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "Eres un extractor de texto. Devuelves SOLO el texto completo del documento, en orden de lectura, sin comentarios ni resúmenes. Conserva títulos, viñetas y tablas como texto plano."
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extrae todo el texto del documento adjunto." },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }
      ],
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gateway error: ${res.status} ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content || '';
  return String(text).slice(0, MAX_TEXT);
}

async function extractDocx(fileUrl: string): Promise<string> {
  const mod: any = await import("https://esm.sh/mammoth@1.6.0?bundle");
  const buf = await (await fetch(fileUrl)).arrayBuffer();
  const result = await mod.extractRawText({ arrayBuffer: buf });
  return String(result.value || '').slice(0, MAX_TEXT);
}

async function extractXlsx(fileUrl: string): Promise<string> {
  const XLSX: any = await import("https://esm.sh/xlsx@0.18.5");
  const buf = new Uint8Array(await (await fetch(fileUrl)).arrayBuffer());
  const wb = XLSX.read(buf, { type: 'array' });
  let out = '';
  for (const name of wb.SheetNames) {
    out += `\n=== Hoja: ${name} ===\n`;
    out += XLSX.utils.sheet_to_csv(wb.Sheets[name]) + '\n';
    if (out.length > MAX_TEXT) break;
  }
  return out.slice(0, MAX_TEXT);
}

// Competence text is built on the client from study plan JSON and sent as textContent.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { notebookId, sourceType, title, fileUrl, fileName, fileSize, textContent, competenceId, mimeType } = body;

    if (!notebookId || !sourceType) {
      return new Response(JSON.stringify({ error: 'notebookId and sourceType required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const token = authHeader.replace('Bearer ', '').trim();
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // Verify notebook ownership and capture current title for auto-naming
    const { data: nb } = await supabase
      .from('notebooks')
      .select('id, user_id, title')
      .eq('id', notebookId)
      .maybeSingle();
    if (!nb) {
      return new Response(JSON.stringify({ error: 'Notebook not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert source as 'processing'
    const { data: src, error: insErr } = await supabase
      .from('notebook_sources')
      .insert({
        notebook_id: notebookId,
        user_id: user.id,
        source_type: sourceType,
        title: title || fileName || 'Sin título',
        file_url: fileUrl || null,
        file_name: fileName || null,
        file_size: fileSize || null,
        status: 'processing',
        metadata: competenceId ? { competence_id: competenceId } : {},
      })
      .select()
      .single();

    if (insErr || !src) {
      return new Response(JSON.stringify({ error: insErr?.message || 'Insert failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let extracted = '';
    let finalTitle = src.title;
    try {
      if (sourceType === 'text') {
        extracted = String(textContent || '').slice(0, MAX_TEXT);
      } else if (sourceType === 'pdf') {
        extracted = await extractWithGemini(fileUrl, mimeType || 'application/pdf');
      } else if (sourceType === 'docx') {
        extracted = await extractDocx(fileUrl);
      } else if (sourceType === 'xlsx') {
        extracted = await extractXlsx(fileUrl);
      } else if (sourceType === 'video') {
        // Store URL and let the user describe; advanced transcription out of scope here
        extracted = `Video de referencia: ${fileUrl}\n${textContent || ''}`.slice(0, MAX_TEXT);
      } else if (sourceType === 'url') {
        const r = await fetch(fileUrl);
        const html = await r.text();
        extracted = html.replace(/<script[\s\S]*?<\/script>/g, '')
          .replace(/<style[\s\S]*?<\/style>/g, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .slice(0, MAX_TEXT);
      } else if (sourceType === 'competence') {
        extracted = String(textContent || '').slice(0, MAX_TEXT);
      } else {
        throw new Error('Tipo de fuente no soportado');
      }

      await supabase
        .from('notebook_sources')
        .update({
          extracted_text: extracted,
          status: 'ready',
          title: finalTitle,
        })
        .eq('id', src.id);

      // Auto-rename the notebook on first source if it still has the default title.
      try {
        const currentTitle = String((nb as any).title || '').trim();
        const isDefaultTitle =
          !currentTitle ||
          currentTitle.toLowerCase() === 'cuaderno sin título' ||
          currentTitle.toLowerCase() === 'cuaderno sin titulo';
        if (isDefaultTitle) {
          // Build a clean excerpt: first meaningful line, fall back to first ~80 chars.
          const cleaned = String(extracted || '')
            .replace(/\s+/g, ' ')
            .trim();
          if (cleaned.length > 0) {
            const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned;
            let excerpt = firstSentence.length > 80
              ? firstSentence.slice(0, 80).trim() + '…'
              : firstSentence;
            // Capitalize first letter
            excerpt = excerpt.charAt(0).toUpperCase() + excerpt.slice(1);
            await supabase
              .from('notebooks')
              .update({ title: excerpt })
              .eq('id', notebookId);
          }
        }
      } catch (renameErr) {
        console.error('Auto-rename notebook failed:', renameErr);
      }

      return new Response(JSON.stringify({ id: src.id, status: 'ready', length: extracted.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e: any) {
      console.error('Ingest error:', e);
      await supabase
        .from('notebook_sources')
        .update({ status: 'error', error_message: String(e?.message || e).slice(0, 500) })
        .eq('id', src.id);
      return new Response(JSON.stringify({ id: src.id, status: 'error', error: String(e?.message || e) }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: any) {
    console.error('notebook-ingest fatal:', error);
    return new Response(JSON.stringify({ error: String(error?.message || error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
