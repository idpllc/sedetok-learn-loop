import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const isCloudinary = (u?: string | null) => !!u && /cloudinary\.com/i.test(u);
const isYouTube = (u?: string | null) => !!u && /youtube\.com|youtu\.be/i.test(u);
const ytId = (u: string) => u.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/)?.[1] ?? null;

async function urlBroken(url: string): Promise<boolean> {
  if (isCloudinary(url)) return true;
  if (!/^https?:\/\//i.test(url) || isYouTube(url)) return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    let r = await fetch(url, { method: "HEAD", signal: ctrl.signal });
    if (r.status === 405 || r.status === 403) r = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" }, signal: ctrl.signal });
    clearTimeout(t);
    return r.status >= 400;
  } catch {
    return true;
  }
}

async function youtubeSearch(q: string, max = 6) {
  const key = Deno.env.get("YOUTUBE_API_KEY");
  if (!key) throw new Error("YOUTUBE_API_KEY no configurada");
  const u = new URL("https://www.googleapis.com/youtube/v3/search");
  Object.entries({ key, part: "snippet", type: "video", videoEmbeddable: "true", safeSearch: "strict", relevanceLanguage: "es", maxResults: String(max), q }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u);
  if (!r.ok) {
    const t = await r.text();
    if (r.status === 403) throw new Error("Cuota diaria de YouTube agotada o clave inválida");
    throw new Error(`YouTube ${r.status}: ${t.slice(0, 200)}`);
  }
  const d = await r.json();
  return (d.items || []).filter((i: any) => i.id?.videoId).map((i: any) => ({
    id: i.id.videoId,
    title: i.snippet?.title || "",
    channel: i.snippet?.channelTitle || "",
    thumbnail: i.snippet?.thumbnails?.high?.url || i.snippet?.thumbnails?.medium?.url || null,
    url: `https://www.youtube.com/watch?v=${i.id.videoId}`,
  }));
}

async function ai(prompt: string): Promise<string | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "user", content: prompt }] }),
  });
  if (r.status === 402 || r.status === 403) throw new Error("Créditos de IA insuficientes");
  if (!r.ok) return null;
  const d = await r.json();
  return d.choices?.[0]?.message?.content?.trim() ?? null;
}

async function suggestFor(admin: any, item: any) {
  const { data: c } = await admin.from("content").select("title, description, subject, category, grade_level").eq("id", item.content_id).maybeSingle();
  const ctx = `Cápsula: ${c?.title || item.content_title}\nDescripción: ${(c?.description || "").slice(0, 300)}\nMateria: ${c?.subject || c?.category || ""}\nGrado: ${c?.grade_level || ""}\nRuta: ${item.path_title || ""}`;
  let query = (await ai(`Genera UNA frase de búsqueda corta en español (máx 8 palabras) para encontrar en YouTube un video educativo que reemplace este contenido. Responde solo la frase.\n${ctx}`)) || `${c?.title || item.content_title} ${c?.subject || ""} explicación`;
  query = query.replace(/["\n]/g, " ").slice(0, 120);
  const results = await youtubeSearch(query);
  let ranked = results;
  if (results.length > 1) {
    const list = results.map((r: any, i: number) => `${i}: ${r.title} — ${r.channel}`).join("\n");
    const ans = await ai(`Contexto:\n${ctx}\n\nVideos:\n${list}\n\nOrdena por pertinencia educativa al tema y nivel. Excluye los no educativos. Responde solo índices separados por coma.`);
    const idx = (ans || "").match(/\d+/g)?.map(Number).filter((n) => n < results.length) || [];
    if (idx.length) ranked = [...new Set(idx)].map((i) => results[i]);
  }
  const suggestions = ranked.slice(0, 3);
  await admin.from("media_repair_items").update({ suggestions, status: suggestions.length ? "suggested" : item.status }).eq("id", item.id);
  return suggestions;
}

async function applyFix(admin: any, item: any, videoUrl: string, userId: string) {
  const id = ytId(videoUrl);
  if (!id) throw new Error("URL de YouTube inválida");
  const thumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const patch: Record<string, string> = {};
  if (item.field === "video_url") { patch.video_url = videoUrl; patch.thumbnail_url = thumb; }
  else if (item.field === "thumbnail_url") patch.thumbnail_url = thumb;
  else throw new Error("Este campo no se repara con YouTube");
  const { error } = await admin.from("content").update(patch).eq("id", item.content_id);
  if (error) throw error;
  await admin.from("media_repair_items").update({ status: "fixed", new_url: item.field === "video_url" ? videoUrl : thumb, fixed_by: userId, fixed_at: new Date().toISOString() }).eq("id", item.id);
  // Mark sibling thumbnail as fixed too
  if (item.field === "video_url") await admin.from("media_repair_items").update({ status: "fixed", new_url: thumb, fixed_by: userId, fixed_at: new Date().toISOString() }).eq("content_id", item.content_id).eq("field", "thumbnail_url");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "No autorizado" }, 401);
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "No autorizado" }, 401);
    const { data: isSA } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "superadmin" });
    if (!isSA) return json({ error: "Solo superadmin" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "scan") {
      const { data: links, error } = await admin.from("learning_path_content")
        .select("path_id, content_id, learning_paths(title), content(id, title, video_url, thumbnail_url, document_url, rich_text)")
        .not("content_id", "is", null).limit(5000);
      if (error) throw error;
      const seen = new Set<string>();
      const candidates: any[] = [];
      for (const l of links || []) {
        const c: any = (l as any).content;
        if (!c) continue;
        for (const field of ["video_url", "thumbnail_url", "document_url"]) {
          const v = c[field];
          if (!v || seen.has(c.id + field)) continue;
          seen.add(c.id + field);
          candidates.push({ content_id: c.id, path_id: l.path_id, path_title: (l as any).learning_paths?.title || null, content_title: c.title, field, old_url: v });
        }
        if (c.rich_text && isCloudinary(c.rich_text) && !seen.has(c.id + "rich_text")) {
          seen.add(c.id + "rich_text");
          const m = c.rich_text.match(/https?:\/\/[^"'\s)]*cloudinary\.com[^"'\s)]*/i);
          candidates.push({ content_id: c.id, path_id: l.path_id, path_title: (l as any).learning_paths?.title || null, content_title: c.title, field: "rich_text", old_url: m?.[0] || "cloudinary" });
        }
      }
      const broken: any[] = [];
      for (let i = 0; i < candidates.length; i += 15) {
        const chunk = candidates.slice(i, i + 15);
        const res = await Promise.all(chunk.map((c) => (c.field === "rich_text" ? Promise.resolve(true) : urlBroken(c.old_url))));
        chunk.forEach((c, j) => res[j] && broken.push(c));
      }
      // Upsert without overwriting status of existing rows
      const { data: existing } = await admin.from("media_repair_items").select("content_id, field, status, old_url");
      const map = new Map((existing || []).map((e: any) => [e.content_id + e.field, e]));
      const toInsert = broken.filter((b) => {
        const e: any = map.get(b.content_id + b.field);
        return !e || (e.status === "fixed" && e.old_url !== b.old_url && false);
      });
      for (let i = 0; i < toInsert.length; i += 200) await admin.from("media_repair_items").insert(toInsert.slice(i, i + 200));
      return json({ checked: candidates.length, broken: broken.length, added: toInsert.length });
    }

    const ids: string[] = Array.isArray(body.ids) ? body.ids.slice(0, 10) : body.id ? [body.id] : [];
    if (!ids.length) return json({ error: "Faltan ids" }, 400);
    const { data: items } = await admin.from("media_repair_items").select("*").in("id", ids);
    const results: any[] = [];

    for (const item of items || []) {
      try {
        if (action === "suggest") results.push({ id: item.id, suggestions: await suggestFor(admin, item) });
        else if (action === "apply") { await applyFix(admin, item, String(body.videoUrl || ""), u.user.id); results.push({ id: item.id, ok: true }); }
        else if (action === "auto") {
          if (!["video_url", "thumbnail_url"].includes(item.field)) { results.push({ id: item.id, skipped: true }); continue; }
          const s = item.suggestions?.length ? item.suggestions : await suggestFor(admin, item);
          if (!s.length) { results.push({ id: item.id, ok: false, error: "Sin resultados" }); continue; }
          await applyFix(admin, item, s[0].url, u.user.id);
          results.push({ id: item.id, ok: true });
        } else if (action === "undo") {
          if (item.field === "rich_text") continue;
          await admin.from("content").update({ [item.field]: item.old_url }).eq("id", item.content_id);
          await admin.from("media_repair_items").update({ status: "broken", new_url: null, fixed_at: null, fixed_by: null }).eq("id", item.id);
          results.push({ id: item.id, ok: true });
        } else if (action === "ignore") {
          await admin.from("media_repair_items").update({ status: "ignored" }).eq("id", item.id);
          results.push({ id: item.id, ok: true });
        } else if (action === "remove_image") {
          if (item.field !== "thumbnail_url") continue;
          await admin.from("content").update({ thumbnail_url: null }).eq("id", item.content_id);
          await admin.from("media_repair_items").update({ status: "fixed", new_url: null, fixed_by: u.user.id, fixed_at: new Date().toISOString() }).eq("id", item.id);
          results.push({ id: item.id, ok: true });
        } else return json({ error: "Acción inválida" }, 400);
      } catch (e: any) {
        results.push({ id: item.id, ok: false, error: String(e?.message || e) });
        if (/Cuota|Créditos/.test(String(e?.message))) return json({ results, halted: String(e.message) });
      }
    }
    return json({ results });
  } catch (e: any) {
    console.error("media-repair", e);
    return json({ error: String(e?.message || e) }, 500);
  }
});
