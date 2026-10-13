import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ScanSearch, Wand2, Youtube, Undo2, EyeOff, Trash2, Sparkles, ImagePlus, CheckCircle2 } from "lucide-react";

type Item = {
  id: string; content_id: string; path_id: string | null; path_title: string | null; content_title: string | null;
  field: string; old_url: string; status: string; suggestions: any[]; new_url: string | null;
};

const FIELD_LABEL: Record<string, string> = { video_url: "Video", thumbnail_url: "Imagen", document_url: "Documento", rich_text: "Imagen en lectura", path_cover: "Portada de ruta", path_thumbnail: "Miniatura de ruta" };
const IMAGE_FIELDS = ["thumbnail_url", "path_cover", "path_thumbnail"];
const ytThumb = (u?: string | null) => { const m = u?.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : null; };
const STATUS_LABEL: Record<string, string> = { broken: "Roto", suggested: "Con sugerencias", fixed: "Reparado", ignored: "Ignorado" };

async function call(body: any) {
  const { data, error } = await supabase.functions.invoke("media-repair", { body });
  if (error) {
    const msg = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
    throw new Error(msg);
  }
  return data;
}

export const BrokenMediaManagement = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [justFixed, setJustFixed] = useState<Set<string>>(new Set());
  const markFixed = (ids: string[]) => setJustFixed((prev) => new Set([...prev, ...ids]));

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["media_repair_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("media_repair_items").select("*").order("path_title").limit(5000);
      if (error) throw error;
      return data as Item[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["media_repair_items"] });

  const filtered = useMemo(() => items.filter((i) => {
    if (justFixed.has(i.id) && status === "pending") { /* keep visible after fixing */ }
    else if (status === "pending" ? !["broken", "suggested"].includes(i.status) : status !== "all" && i.status !== status) return false;
    const s = search.toLowerCase();
    return !s || (i.path_title || "").toLowerCase().includes(s) || (i.content_title || "").toLowerCase().includes(s);
  }), [items, status, search, justFixed]);

  const groups = useMemo(() => {
    const m = new Map<string, Item[]>();
    filtered.forEach((i) => { const k = i.path_title || "Sin ruta"; m.set(k, [...(m.get(k) || []), i]); });
    return [...m.entries()];
  }, [filtered]);

  const counts = useMemo(() => ({
    pending: items.filter((i) => ["broken", "suggested"].includes(i.status)).length,
    fixed: items.filter((i) => i.status === "fixed").length,
    paths: new Set(items.filter((i) => ["broken", "suggested"].includes(i.status)).map((i) => i.path_id)).size,
  }), [items]);

  const run = async (key: string, fn: () => Promise<any>) => {
    setBusy(key);
    try { return await fn(); }
    catch (e: any) { toast({ title: "Error", description: String(e?.message || e), variant: "destructive" }); }
    finally { setBusy(null); refresh(); }
  };

  const scan = () => run("scan", async () => {
    const r = await call({ action: "scan" });
    toast({ title: "Escaneo completo", description: `${r.checked} enlaces revisados, ${r.broken} rotos, ${r.added} nuevos.` });
  });

  const batch = async (action: "auto" | "suggest") => {
    const targets = filtered.filter((i) => ["broken", "suggested"].includes(i.status) && ["video_url", "thumbnail_url", "path_cover", "path_thumbnail"].includes(i.field) && (action === "auto" || !i.suggestions?.length));
    if (!targets.length) return toast({ title: "Nada por procesar" });
    setBusy(action); setProgress({ done: 0, total: targets.length });
    let ok = 0;
    try {
      for (let i = 0; i < targets.length; i += 5) {
        const r = await call({ action, ids: targets.slice(i, i + 5).map((t) => t.id) });
        const done = (r.results || []).filter((x: any) => x.ok || x.suggestions?.length);
        ok += done.length;
        markFixed(done.map((x: any) => x.id));
        setProgress({ done: Math.min(i + 5, targets.length), total: targets.length });
        refresh();
        if (r.halted) { toast({ title: "Proceso detenido", description: r.halted, variant: "destructive" }); break; }
      }
      toast({ title: action === "auto" ? "Reparación terminada" : "Sugerencias listas", description: `${ok} de ${targets.length} procesados.` });
    } catch (e: any) {
      toast({ title: "Error", description: String(e?.message || e), variant: "destructive" });
    } finally { setBusy(null); setProgress(null); refresh(); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Medios rotos en rutas</CardTitle>
          <CardDescription>Detecta videos, imágenes y documentos que ya no cargan (por ejemplo, los de Cloudinary) y reemplázalos por videos de YouTube del mismo tema o por imágenes generadas con IA.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3"><p className="text-2xl font-bold">{counts.pending}</p><p className="text-xs text-muted-foreground">Pendientes</p></div>
            <div className="rounded-lg border p-3"><p className="text-2xl font-bold">{counts.paths}</p><p className="text-xs text-muted-foreground">Rutas afectadas</p></div>
            <div className="rounded-lg border p-3"><p className="text-2xl font-bold">{counts.fixed}</p><p className="text-xs text-muted-foreground">Reparados</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={scan} disabled={!!busy}>{busy === "scan" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ScanSearch className="w-4 h-4 mr-2" />}Escanear rutas</Button>
            <Button variant="secondary" onClick={() => batch("suggest")} disabled={!!busy}><Sparkles className="w-4 h-4 mr-2" />Solo sugerir</Button>
            <Button variant="default" onClick={() => batch("auto")} disabled={!!busy}><Wand2 className="w-4 h-4 mr-2" />Reparar todo automáticamente</Button>
          </div>
          {progress && <div className="space-y-1"><Progress value={(progress.done / progress.total) * 100} /><p className="text-xs text-muted-foreground">{progress.done} / {progress.total}</p></div>}
          <p className="text-xs text-muted-foreground">La búsqueda de YouTube tiene un límite diario (~100 búsquedas). Si se agota, el proceso se detiene y puedes continuar al día siguiente.</p>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Buscar ruta o cápsula…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="fixed">Reparados</SelectItem>
                <SelectItem value="ignored">Ignorados</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <Card><CardContent className="p-4 space-y-2">
          <div className="aspect-video w-full max-w-2xl mx-auto"><iframe className="w-full h-full rounded-lg" src={`https://www.youtube.com/embed/${preview}`} allowFullScreen title="Vista previa" /></div>
          <div className="text-center"><Button variant="ghost" size="sm" onClick={() => setPreview(null)}>Cerrar vista previa</Button></div>
        </CardContent></Card>
      )}

      {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : groups.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No hay elementos. Pulsa "Escanear rutas".</p>
      ) : groups.map(([path, list]) => (
        <Card key={path}>
          <CardHeader className="pb-2"><CardTitle className="text-base">{path} <Badge variant="secondary" className="ml-2">{list.length}</Badge></CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {list.map((i) => (
              <div key={i.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{FIELD_LABEL[i.field] || i.field}</Badge>
                  <Badge variant={i.status === "fixed" ? "default" : i.status === "ignored" ? "secondary" : "destructive"}>{STATUS_LABEL[i.status] || i.status}</Badge>
                  <span className="font-medium text-sm">{i.content_title}</span>
                  <a href={`/sedetok?content=${i.content_id}`} target="_blank" rel="noreferrer" className="text-xs text-primary underline">ver</a>
                </div>
                <p className="text-xs text-muted-foreground truncate">Antes: {i.old_url}</p>
                {i.status === "fixed" && (
                  <div className="flex items-center gap-3 rounded-md bg-muted/50 p-2">
                    {i.new_url && (ytThumb(i.new_url) ? (
                      <button type="button" onClick={() => setPreview(ytThumb(i.new_url))} className="shrink-0"><img src={`https://i.ytimg.com/vi/${ytThumb(i.new_url)}/mqdefault.jpg`} alt="Nuevo video" loading="lazy" width={160} height={90} className="w-40 aspect-video object-cover rounded" /></button>
                    ) : /\.(png|jpe?g|webp|gif)(\?|$)/i.test(i.new_url) || i.new_url.includes("i.ytimg.com") || i.new_url.includes("amazonaws.com") ? (
                      <img src={i.new_url} alt="Nueva imagen" loading="lazy" width={160} height={90} className="w-40 aspect-video object-cover rounded shrink-0" />
                    ) : null)}
                    <div className="min-w-0 text-xs space-y-1">
                      <p className="flex items-center gap-1 font-medium text-primary"><CheckCircle2 className="w-3 h-3" />{i.new_url ? "Vinculado" : "Imagen quitada"}</p>
                      {i.new_url && <a href={i.new_url} target="_blank" rel="noreferrer" className="block truncate underline">{i.new_url}</a>}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {["video_url", "thumbnail_url"].includes(i.field) && i.status !== "fixed" && (
                    <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run(i.id, () => call({ action: "suggest", id: i.id }))}>
                      {busy === i.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Youtube className="w-3 h-3 mr-1" />}Buscar en YouTube
                    </Button>
                  )}
                  {IMAGE_FIELDS.includes(i.field) && i.status !== "fixed" && (
                    <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => run(i.id, async () => { const r = await call({ action: "ai_image", id: i.id }); const res = r.results?.[0]; if (res && !res.ok) throw new Error(res.error || "No se pudo generar"); markFixed([i.id]); toast({ title: "Imagen generada con IA" }); })}>
                      {busy === i.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ImagePlus className="w-3 h-3 mr-1" />}Generar imagen con IA
                    </Button>
                  )}
                  {IMAGE_FIELDS.includes(i.field) && i.status !== "fixed" && (
                    <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => run(i.id, () => call({ action: "remove_image", id: i.id }))}><Trash2 className="w-3 h-3 mr-1" />Quitar imagen</Button>
                  )}
                  {i.status === "fixed" && i.field !== "rich_text" && (
                    <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => run(i.id, () => call({ action: "undo", id: i.id }))}><Undo2 className="w-3 h-3 mr-1" />Deshacer</Button>
                  )}
                  {i.status !== "ignored" && i.status !== "fixed" && (
                    <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => run(i.id, () => call({ action: "ignore", id: i.id }))}><EyeOff className="w-3 h-3 mr-1" />Ignorar</Button>
                  )}
                </div>
                {i.status !== "fixed" && i.suggestions?.length > 0 && (
                  <div className="grid sm:grid-cols-3 gap-2">
                    {i.suggestions.map((s: any) => (
                      <div key={s.id} className="rounded-md border overflow-hidden">
                        <button type="button" onClick={() => setPreview(s.id)} className="block w-full">
                          <img src={s.thumbnail} alt={s.title} loading="lazy" width={320} height={180} className="w-full aspect-video object-cover" />
                        </button>
                        <div className="p-2 space-y-1">
                          <p className="text-xs font-medium line-clamp-2">{s.title}</p>
                          <p className="text-[11px] text-muted-foreground">{s.channel}</p>
                          <Button size="sm" className="w-full" disabled={!!busy} onClick={() => run(i.id, async () => { await call({ action: "apply", id: i.id, videoUrl: s.url }); markFixed([i.id]); toast({ title: "Video vinculado", description: s.title }); })}>Usar este video</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
