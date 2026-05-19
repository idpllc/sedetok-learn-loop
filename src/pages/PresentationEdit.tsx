import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, Plus, Copy, Trash2, ChevronUp, ChevronDown,
  Palette, Image as ImageIcon, Play, Save, LayoutGrid, GripVertical,
  Type, Heading1, X as XIcon,
} from "lucide-react";
import SlideRenderer, { type Slide, type SlideLayout, type SlideElement } from "@/components/presentation/SlideRenderer";
import { PRESENTATION_THEMES, getTheme, type SlideBackground } from "@/lib/presentationThemes";
import { useS3Upload } from "@/hooks/useS3Upload";

// --- helpers ----------------------------------------------------------------

const newId = (prefix = "x") => (typeof crypto !== "undefined" && (crypto as any).randomUUID)
  ? (crypto as any).randomUUID()
  : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const mkEl = (partial: Omit<SlideElement, "id">): SlideElement => ({
  id: newId("e"),
  ...partial,
});

// Seed default editable text elements for each layout. Every block is a free
// element so users can move/edit/delete it.
const seedElementsForLayout = (layout: SlideLayout): SlideElement[] => {
  switch (layout) {
    case "title":
    case "closing":
      return [
        mkEl({ type: "heading", content: "Título principal", x: 10, y: 35, w: 80, size: 64, weight: "bold", align: "center" }),
        mkEl({ type: "text", content: "Subtítulo o descripción", x: 15, y: 56, w: 70, size: 24, align: "center" }),
      ];
    case "section_header":
      return [
        mkEl({ type: "text", content: "SECCIÓN", x: 10, y: 38, w: 80, size: 18, align: "center" }),
        mkEl({ type: "heading", content: "Nuevo capítulo", x: 10, y: 45, w: 80, size: 72, weight: "bold", align: "center" }),
      ];
    case "title_bullets":
      return [
        mkEl({ type: "heading", content: "Título", x: 6, y: 8, w: 88, size: 44, weight: "bold" }),
        mkEl({ type: "text", content: "• Punto 1\n• Punto 2\n• Punto 3", x: 6, y: 28, w: 88, size: 22 }),
      ];
    case "two_column":
      return [
        mkEl({ type: "heading", content: "Título", x: 6, y: 8, w: 88, size: 40, weight: "bold" }),
        mkEl({ type: "text", content: "• Idea A\n• Idea B", x: 6, y: 30, w: 42, size: 22 }),
        mkEl({ type: "text", content: "• Idea C\n• Idea D", x: 52, y: 30, w: 42, size: 22 }),
      ];
    case "quote":
      return [
        mkEl({ type: "text", content: '"Escribe una cita inspiradora"', x: 10, y: 35, w: 80, size: 40, align: "center" }),
        mkEl({ type: "text", content: "— Autor", x: 10, y: 60, w: 80, size: 20, align: "center" }),
      ];
    case "cards_2":
    case "cards_3":
    case "cards_4": {
      const n = layout === "cards_2" ? 2 : layout === "cards_4" ? 4 : 3;
      const cw = n === 2 ? 44 : n === 4 ? 21 : 28;
      const gap = n === 2 ? 4 : n === 4 ? 3 : 4;
      const totalW = n * cw + (n - 1) * gap;
      const startX = (100 - totalW) / 2;
      const els: SlideElement[] = [
        mkEl({ type: "heading", content: "Título de la sección", x: 6, y: 8, w: 88, size: 40, weight: "bold", align: "center" }),
      ];
      for (let i = 0; i < n; i++) {
        const x = startX + i * (cw + gap);
        els.push(mkEl({ type: "heading", content: `Tarjeta ${i + 1}`, x, y: 32, w: cw, size: 24, weight: "bold" }));
        els.push(mkEl({ type: "text", content: "Describe este concepto.", x, y: 42, w: cw, size: 18 }));
      }
      return els;
    }
    case "image_full":
    case "image_left":
    case "image_right":
    case "cards_image":
      return [
        mkEl({ type: "heading", content: "Título", x: 6, y: 70, w: 88, size: 40, weight: "bold" }),
        mkEl({ type: "text", content: "Subtítulo o descripción", x: 6, y: 82, w: 88, size: 20 }),
      ];
    default:
      return [
        mkEl({ type: "heading", content: "Título", x: 6, y: 10, w: 88, size: 40, weight: "bold" }),
      ];
  }
};

const blankSlide = (layout: SlideLayout = "title"): Slide => ({
  id: newId("s"),
  order: 0,
  layout,
  title: "",
  elements: seedElementsForLayout(layout),
});

// --- main page --------------------------------------------------------------

export default function PresentationEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { uploadFile } = useS3Upload();

  const { data: initial, isLoading } = useQuery({
    queryKey: ["presentation-edit", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content")
        .select("id, title, presentation_data, creator_id, content_type, is_public")
        .eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const [title, setTitle] = useState("");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [themeId, setThemeId] = useState<string>("teal");
  const [globalBg, setGlobalBg] = useState<SlideBackground>(null);
  const [current, setCurrent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [themesOpen, setThemesOpen] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutosaveRef = useRef(true);

  // Hydrate state from query
  useEffect(() => {
    if (!initial) return;
    setTitle(initial.title || "");
    const pd = initial.presentation_data || {};
    setSlides(Array.isArray(pd.slides) ? pd.slides : []);
    setThemeId(pd.theme || pd.meta?.theme || "teal");
    setGlobalBg(pd.background || null);
    skipAutosaveRef.current = true;
  }, [initial]);

  const isOwner = !!user && initial && initial.creator_id === user.id;
  const theme = getTheme(themeId);
  const presentationKind: "slides" | "flashcards" =
    initial?.presentation_data?.meta?.type === "flashcards" ? "flashcards" : "slides";
  const aspectRatio = presentationKind === "flashcards" ? "1/1" : "16/9";

  // Autosave (debounced)
  const saveNow = useCallback(async (snapshot?: { title?: string; slides?: Slide[]; themeId?: string; bg?: SlideBackground }) => {
    if (!id) return;
    setSaving(true);
    try {
      const t = snapshot?.title ?? title;
      const sl = snapshot?.slides ?? slides;
      const th = snapshot?.themeId ?? themeId;
      const bg = snapshot?.bg ?? globalBg;
      const newPd = {
        ...(initial?.presentation_data || {}),
        slides: sl,
        theme: th,
        background: bg,
        meta: { ...(initial?.presentation_data?.meta || {}), theme: th },
      };
      const { error } = await supabase
        .from("content")
        .update({ title: t, presentation_data: newPd })
        .eq("id", id);
      if (error) throw error;
      setSavedAt(new Date());
    } catch (e: any) {
      console.error("autosave", e);
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }, [id, title, slides, themeId, globalBg, initial]);

  useEffect(() => {
    if (skipAutosaveRef.current) { skipAutosaveRef.current = false; return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { saveNow(); }, 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, slides, themeId, globalBg]);

  // --- slide ops ----
  const updateSlide = (idx: number, patch: Partial<Slide>) => {
    setSlides((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };
  const updateCard = (slideIdx: number, cardIdx: number, patch: any) => {
    setSlides((prev) => prev.map((s, i) => {
      if (i !== slideIdx) return s;
      const cards = [...(s.cards || [])];
      cards[cardIdx] = { ...cards[cardIdx], ...patch };
      return { ...s, cards };
    }));
  };
  const [layoutPickerOpen, setLayoutPickerOpen] = useState(false);
  const addSlide = (layout: SlideLayout = "title") => {
    setSlides((prev) => {
      const next = [...prev, blankSlide(layout)];
      next.forEach((s, i) => (s.order = i));
      return next;
    });
    setCurrent(slides.length);
    setLayoutPickerOpen(false);
  };
  // Change the layout of the current slide. If the slide has no free
  // elements yet, seed them so the user can edit/move/delete every block.
  const changeLayout = (idx: number, layout: SlideLayout) => {
    setSlides((prev) => prev.map((s, i) => {
      if (i !== idx) return s;
      const hasEls = (s.elements || []).length > 0;
      return { ...s, layout, elements: hasEls ? s.elements : seedElementsForLayout(layout) };
    }));
  };
  const duplicateSlide = (idx: number) => {
    setSlides((prev) => {
      const copy = JSON.parse(JSON.stringify(prev[idx]));
      copy.id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const next = [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
      next.forEach((s, i) => (s.order = i));
      return next;
    });
  };
  const deleteSlide = (idx: number) => {
    if (slides.length <= 1) return toast.error("Debe quedar al menos 1 diapositiva");
    setSlides((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })));
    setCurrent((c) => Math.max(0, Math.min(c, slides.length - 2)));
  };
  const moveSlide = (idx: number, dir: -1 | 1) => {
    setSlides((prev) => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      next.forEach((s, i) => (s.order = i));
      return next;
    });
    setCurrent((c) => (c === idx ? idx + dir : c === idx + dir ? idx : c));
  };

  // --- free elements (insertable) ---
  const addElement = (slideIdx: number, partial: Partial<SlideElement> & { type: SlideElement["type"] }) => {
    const id = (typeof crypto !== "undefined" && (crypto as any).randomUUID)
      ? (crypto as any).randomUUID()
      : `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const el: SlideElement = { id, x: 10, y: 10, w: 50, ...partial };
    setSlides((prev) => prev.map((s, i) => i === slideIdx ? { ...s, elements: [...(s.elements || []), el] } : s));
  };

  // --- background image upload ----
  const onBgUpload = async (file: File, applyAll: boolean) => {
    try {
      const url = await uploadFile(file, "image");
      if (!url) return;
      const bg: SlideBackground = { type: "image", value: url };
      if (applyAll) setGlobalBg(bg);
      else updateSlide(current, { background: bg });
      toast.success("Fondo aplicado");
    } catch (e: any) {
      toast.error("Error subiendo imagen");
    }
  };

  useEffect(() => {
    if (slides.length === 0) return;
    if (current > slides.length - 1) setCurrent(slides.length - 1);
    else if (current < 0) setCurrent(0);
  }, [slides.length, current]);

  // ---- guards ----
  if (authLoading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!initial || initial.content_type !== "presentacion") {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Presentación no encontrada.</div>;
  }
  if (!isOwner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-muted-foreground text-sm">Solo el creador puede editar esta presentación.</p>
        <Button variant="outline" onClick={() => navigate(`/presentation/${id}`)}>Ver presentación</Button>
      </div>
    );
  }

  const slide = slides.length > 0 ? (slides[current] ?? slides[0]) : null;

  if (!slide) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-muted-foreground text-sm">Esta presentación no tiene diapositivas.</p>
        <Button onClick={() => addSlide("title")}>Añadir diapositiva</Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Helmet><title>Editar · {title || "Presentación"}</title></Helmet>

      {/* Top bar */}
      <header className="flex items-center gap-2 px-3 h-14 border-b shrink-0">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(`/presentation/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Título" className="max-w-md h-9 text-sm font-semibold border-none focus-visible:ring-1"
        />
        <span className="text-xs text-muted-foreground">
          {initial.is_public ? "● Público" : "○ Privado"}
        </span>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {saving ? "Guardando…" : savedAt ? `Guardado ${savedAt.toLocaleTimeString()}` : ""}
        </span>
        <Button size="sm" variant="ghost" onClick={() => setThemesOpen(true)}>
          <Palette className="h-4 w-4" /> <span className="hidden sm:inline ml-1">Temas</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setBgOpen(true)}>
          <ImageIcon className="h-4 w-4" /> <span className="hidden sm:inline ml-1">Fondo</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => saveNow()}>
          <Save className="h-4 w-4" /> <span className="hidden sm:inline ml-1">Guardar</span>
        </Button>
        <Button size="sm" variant="default" onClick={() => navigate(`/presentation/${id}`)}>
          <Play className="h-4 w-4" /> <span className="hidden sm:inline ml-1">Presentar</span>
        </Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 md:w-64 shrink-0 border-r flex flex-col bg-muted/20">
          <div className="p-2 border-b">
            <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => setLayoutPickerOpen(true)}>
              <Plus className="h-4 w-4" /> Añadir diapositiva
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setCurrent(i)}
                className={`group relative w-full rounded-md border-2 overflow-hidden transition ${i === current ? "border-primary shadow" : "border-transparent hover:border-border"}`}
              >
                <span className="absolute top-1 left-1 z-10 text-[10px] bg-background/80 rounded px-1.5 py-0.5">
                  {i + 1}
                </span>
                <div className="absolute top-1 right-1 z-10 hidden group-hover:flex flex-col gap-0.5">
                  <button onClick={(e) => { e.stopPropagation(); moveSlide(i, -1); }} className="p-0.5 rounded bg-background/80 hover:bg-background"><ChevronUp className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); moveSlide(i, 1); }} className="p-0.5 rounded bg-background/80 hover:bg-background"><ChevronDown className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); duplicateSlide(i); }} className="p-0.5 rounded bg-background/80 hover:bg-background"><Copy className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); deleteSlide(i); }} className="p-0.5 rounded bg-background/80 hover:bg-destructive/20 text-destructive"><Trash2 className="h-3 w-3" /></button>
                </div>
                <div style={{ aspectRatio, pointerEvents: "none" }} className="relative">
                  <div style={{ position: "absolute", inset: 0, transform: "scale(0.18)", transformOrigin: "top left", width: "555%", height: "555%" }}>
                    <SlideRenderer slide={{ ...s, background: s.background || globalBg }} themeId={themeId} />
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="p-2 border-t text-[10px] text-muted-foreground">
            {slides.length} diapositiva{slides.length !== 1 && "s"} · Tema {theme.name}
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 overflow-auto p-4 md:p-8 bg-muted/10 flex flex-col items-center">
          {/* Layout switcher */}
          <div className="w-full max-w-5xl mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1"><LayoutGrid className="h-3 w-3" /> Diseño:</span>
            {(["title", "section_header", "title_bullets", "cards_2", "cards_3", "cards_4", "cards_image", "two_column", "image_left", "image_right", "image_full", "quote", "closing"] as SlideLayout[]).map((l) => (
              <button
                key={l}
                onClick={() => changeLayout(current, l)}
                className={`text-[11px] px-2 py-1 rounded border ${slide.layout === l ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Insert elements */}
          <div className="w-full max-w-5xl mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1"><Plus className="h-3 w-3" /> Insertar:</span>
            <button
              onClick={() => addElement(current, { type: "heading", content: "Título", size: 40, weight: "bold", x: 10, y: 10, w: 70 })}
              className="text-[11px] px-2 py-1 rounded border bg-background hover:bg-muted flex items-center gap-1"
            >
              <Heading1 className="h-3 w-3" /> Título
            </button>
            <button
              onClick={() => addElement(current, { type: "text", content: "Escribe aquí…", size: 18, x: 10, y: 30, w: 70 })}
              className="text-[11px] px-2 py-1 rounded border bg-background hover:bg-muted flex items-center gap-1"
            >
              <Type className="h-3 w-3" /> Párrafo
            </button>
            <label className="text-[11px] px-2 py-1 rounded border bg-background hover:bg-muted flex items-center gap-1 cursor-pointer">
              <ImageIcon className="h-3 w-3" /> Imagen
              <input
                type="file" accept="image/*" className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  try {
                    const url = await uploadFile(f, "image");
                    if (url) addElement(current, { type: "image", src: url, x: 15, y: 20, w: 40, h: 40 });
                  } catch { toast.error("Error subiendo imagen"); }
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          {/* Slide stage with inline editable overlays */}
          <div className="w-full max-w-5xl rounded-xl border shadow-2xl overflow-hidden relative" style={{ aspectRatio }}>
            <SlideRenderer slide={{ ...slide, background: slide.background || globalBg }} themeId={themeId} editMode />
            <EditableOverlay
              slide={slide}
              theme={theme}
              onUpdate={(p) => updateSlide(current, p)}
              onUpdateCard={(ci, p) => updateCard(current, ci, p)}
            />
            <FreeElementsEditor
              elements={slide.elements || []}
              onUpdate={(els) => updateSlide(current, { elements: els })}
            />
          </div>

          {/* Speaker notes */}
          <div className="w-full max-w-5xl mt-4">
            <label className="text-xs font-semibold text-muted-foreground">Notas del docente</label>
            <textarea
              value={slide.speaker_notes || ""}
              onChange={(e) => updateSlide(current, { speaker_notes: e.target.value })}
              className="mt-1 w-full min-h-[70px] rounded border bg-background p-2 text-sm"
              placeholder="Notas (no se muestran en la presentación)"
            />
          </div>
        </main>
      </div>

      {/* Themes panel */}
      <Sheet open={themesOpen} onOpenChange={setThemesOpen}>
        <SheetContent side="right" className="w-[360px] z-[80]">
          <SheetHeader><SheetTitle>Temas</SheetTitle></SheetHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {Object.values(PRESENTATION_THEMES).map((t) => (
              <button
                key={t.id}
                onClick={() => { setThemeId(t.id); }}
                className={`group rounded-lg overflow-hidden border-2 ${themeId === t.id ? "border-primary" : "border-transparent hover:border-border"}`}
              >
                <div className="h-24 flex items-center justify-center text-xs font-bold p-2 text-center" style={{ background: t.bg, color: t.text }}>
                  <div className="rounded px-2 py-1.5" style={{ background: t.cardBg, color: t.textOnCard }}>
                    {t.name}
                  </div>
                </div>
                <div className="flex h-2">
                  {t.swatch.map((s, i) => <div key={i} className="flex-1" style={{ background: s }} />)}
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Background panel */}
      <Sheet open={bgOpen} onOpenChange={setBgOpen}>
        <SheetContent side="right" className="w-[360px] z-[80]">
          <SheetHeader><SheetTitle>Fondo</SheetTitle></SheetHeader>
          <div className="space-y-5 mt-4">
            <div>
              <label className="text-xs font-semibold mb-2 block">Color sólido</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  defaultValue={(globalBg?.type === "color" ? globalBg.value : theme.bg)}
                  onChange={(e) => setGlobalBg({ type: "color", value: e.target.value })}
                  className="h-10 w-16 rounded border cursor-pointer"
                />
                <Button size="sm" variant="outline" onClick={() => setGlobalBg(null)}>Usar tema</Button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-2 block">Gradiente</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  "linear-gradient(135deg,#0E7C6E,#1E1B4B)",
                  "linear-gradient(135deg,#7C2D12,#1E1B4B)",
                  "linear-gradient(135deg,#0F172A,#312E81)",
                  "linear-gradient(135deg,#FAF7F0,#FED7AA)",
                  "linear-gradient(135deg,#14532D,#0E7C6E)",
                  "linear-gradient(135deg,#000000,#7C2D12)",
                ].map((g) => (
                  <button key={g} onClick={() => setGlobalBg({ type: "gradient", value: g })}
                    className="h-12 rounded border" style={{ background: g }} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-2 block">Imagen</label>
              <input type="file" accept="image/*"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onBgUpload(f, true); }}
                className="text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Se aplica a todas las diapositivas (con overlay oscuro automático).</p>
            </div>
            <div className="pt-3 border-t">
              <Button size="sm" variant="outline" className="w-full" onClick={() => updateSlide(current, { background: globalBg })}>
                Aplicar fondo solo a la diapositiva actual
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// --- inline editable overlay (transparent on top of the rendered slide) -----

function EditableOverlay({
  slide, theme, onUpdate, onUpdateCard,
}: {
  slide: Slide;
  theme: ReturnType<typeof getTheme>;
  onUpdate: (p: Partial<Slide>) => void;
  onUpdateCard: (idx: number, p: any) => void;
}) {
  // We render an absolutely-positioned editable layer that mirrors the
  // structure of the read-only renderer for the current layout so the user
  // can click any text and rewrite it. Keeps it simple: re-uses Tailwind
  // utility classes but with `pointer-events-auto` and transparent bg.
  const TEXT_CLR = { color: theme.text } as const;
  const ON_CARD = { color: theme.textOnCard } as const;

  switch (slide.layout) {
    case "title":
    case "closing":
    case "section_header":
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-12 py-14 z-10">
          <Editable value={slide.title}
            onChange={(v) => onUpdate({ title: v })}
            multiline
            className="text-3xl md:text-6xl font-extrabold leading-tight max-w-5xl"
            placeholder="Título"
          />
          {slide.layout !== "section_header" && (
            <Editable value={slide.subtitle || ""}
              onChange={(v) => onUpdate({ subtitle: v })}
              multiline
              className="mt-6 text-lg md:text-2xl max-w-3xl opacity-90"
              placeholder="Subtítulo"
            />
          )}
        </div>
      );

    case "cards_2":
    case "cards_3":
    case "cards_4":
    case "cards_image": {
      const n = slide.layout === "cards_2" ? 2 : slide.layout === "cards_4" ? 4 : 3;
      const cards = (slide.cards || []).slice(0, n);
      const grid = n === 2 ? "md:grid-cols-2" : n === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3";
      return (
        <div className="absolute inset-0 flex flex-col px-8 md:px-14 py-10 md:py-12 z-10">
          <Editable value={slide.title}
            onChange={(v) => onUpdate({ title: v })}
            className="text-2xl md:text-5xl font-extrabold mb-6 md:mb-10 text-center md:text-left"
            placeholder="Título de la sección"
          />
          <div className={`grid grid-cols-1 ${grid} gap-4 md:gap-6 flex-1 min-h-0`}>
            {cards.map((c, i) => (
              <div key={i} className="rounded-2xl p-5 md:p-7 flex flex-col"
                style={{ background: "transparent" }}
              >
                {/* spacer for icon zone — handled by underlying renderer */}
                <div className="h-7 md:h-9 mb-4" />
                {slide.layout === "cards_image" && <div className="aspect-[4/3] mb-3" />}
                <Editable value={c.title}
                  onChange={(v) => onUpdateCard(i, { title: v })}
                  className="text-base md:text-xl font-bold mb-2 md:mb-3"
                  placeholder="Título de tarjeta" />
                <Editable value={c.body} multiline
                  onChange={(v) => onUpdateCard(i, { body: v })}
                  className="text-sm md:text-base leading-snug opacity-90"
                  placeholder="Descripción de la tarjeta. Usa **negrita** para resaltar." />
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "title_bullets":
      return (
        <div className="absolute inset-0 flex flex-col px-8 md:px-14 py-10 md:py-12 z-10">
          <Editable value={slide.title}
            onChange={(v) => onUpdate({ title: v })}
            className="text-2xl md:text-4xl font-bold mb-6 md:mb-8" placeholder="Título" />
          <div className="space-y-3 md:space-y-5 flex-1">
            {(slide.bullets || []).map((b, i) => (
              <div key={i} className="flex gap-3 text-base md:text-xl leading-snug">
                <span className="font-bold opacity-70">{i + 1}.</span>
                <Editable value={b} multiline
                  onChange={(v) => {
                    const next = [...(slide.bullets || [])];
                    next[i] = v;
                    onUpdate({ bullets: next.filter((x) => x.trim() || true) });
                  }}
                  className="flex-1"
                  placeholder="Punto…"
                />
                <button
                  onClick={() => onUpdate({ bullets: (slide.bullets || []).filter((_, j) => j !== i) })}
                  className="text-xs opacity-50 hover:opacity-100"
                >×</button>
              </div>
            ))}
            <button
              onClick={() => onUpdate({ bullets: [...(slide.bullets || []), "Nuevo punto"] })}
              className="text-xs opacity-70 hover:opacity-100 px-2 py-1 border rounded"
            >+ Punto</button>
          </div>
        </div>
      );

    case "two_column":
      return (
        <div className="absolute inset-0 flex flex-col px-8 md:px-14 py-10 md:py-12 z-10">
          <Editable value={slide.title} onChange={(v) => onUpdate({ title: v })}
            className="text-2xl md:text-4xl font-bold mb-6 md:mb-10" placeholder="Título" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 flex-1">
            {(["left_column", "right_column"] as const).map((key) => (
              <div key={key} className="space-y-3">
                {(slide[key] || []).map((b, i) => (
                  <div key={i} className="flex gap-3 text-base md:text-xl">
                    <span className="font-bold opacity-70">•</span>
                    <Editable value={b} multiline
                      onChange={(v) => {
                        const next = [...(slide[key] || [])]; next[i] = v;
                        onUpdate({ [key]: next } as any);
                      }}
                      className="flex-1" placeholder="Idea…" />
                    <button onClick={() => onUpdate({ [key]: (slide[key] || []).filter((_, j) => j !== i) } as any)}
                      className="text-xs opacity-50 hover:opacity-100">×</button>
                  </div>
                ))}
                <button onClick={() => onUpdate({ [key]: [...(slide[key] || []), "Nueva idea"] } as any)}
                  className="text-xs opacity-70 hover:opacity-100 px-2 py-1 border rounded">+ Idea</button>
              </div>
            ))}
          </div>
        </div>
      );

    case "quote":
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-12 py-14 z-10">
          <Editable value={slide.quote || ""} multiline
            onChange={(v) => onUpdate({ quote: v })}
            className="text-2xl md:text-4xl font-serif italic leading-snug max-w-4xl"
            placeholder="Escribe tu cita"
          />
          <Editable value={slide.quote_author || ""}
            onChange={(v) => onUpdate({ quote_author: v })}
            className="mt-6 text-base opacity-80"
            placeholder="— Autor"
          />
        </div>
      );

    case "image_left":
    case "image_right":
    case "image_full":
      return (
        <div className="absolute inset-0 flex flex-col p-6 md:p-12 z-10 pointer-events-none">
          <div className="ml-auto mr-auto md:ml-0 md:mr-auto max-w-3xl pointer-events-auto">
            <Editable value={slide.title}
              onChange={(v) => onUpdate({ title: v })}
              className="text-xl md:text-4xl font-bold drop-shadow"
              placeholder="Título" />
            <Editable value={slide.subtitle || ""} multiline
              onChange={(v) => onUpdate({ subtitle: v })}
              className="mt-3 text-sm md:text-lg opacity-90"
              placeholder="Subtítulo o descripción" />
          </div>
        </div>
      );

    default:
      return null;
  }
}

// --- free elements editor (draggable text/image blocks) ---------------------

function FreeElementsEditor({
  elements, onUpdate,
}: {
  elements: SlideElement[];
  onUpdate: (els: SlideElement[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const updateOne = (id: string, patch: Partial<SlideElement>) => {
    onUpdate(elements.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };
  const removeOne = (id: string) => {
    onUpdate(elements.filter((e) => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const onMouseDown = (e: React.MouseEvent, el: SlideElement) => {
    if ((e.target as HTMLElement).isContentEditable) return;
    e.preventDefault();
    setSelectedId(el.id);
    dragRef.current = { id: el.id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y };
    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current;
      const c = containerRef.current;
      if (!d || !c) return;
      const rect = c.getBoundingClientRect();
      const dx = ((ev.clientX - d.startX) / rect.width) * 100;
      const dy = ((ev.clientY - d.startY) / rect.height) * 100;
      updateOne(d.id, { x: Math.max(0, Math.min(95, d.origX + dx)), y: Math.max(0, Math.min(95, d.origY + dy)) });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div ref={containerRef} className="absolute inset-0 z-20" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}>
      {elements.map((el) => {
        const isSel = selectedId === el.id;
        const style: React.CSSProperties = {
          position: "absolute",
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: el.h ? `${el.h}%` : undefined,
        };
        return (
          <div
            key={el.id}
            style={style}
            className={`group ${isSel ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50"} rounded`}
            onMouseDown={(e) => onMouseDown(e, el)}
            onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
          >
            {isSel && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeOne(el.id); }}
                className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow z-10"
                title="Eliminar"
              >
                <XIcon className="h-3 w-3" />
              </button>
            )}
            {el.type === "image" ? (
              el.src ? (
                <img src={el.src} alt="" className="w-full h-full object-cover rounded-lg pointer-events-none" />
              ) : (
                <div className="w-full h-full bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">Imagen</div>
              )
            ) : (
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateOne(el.id, { content: e.currentTarget.innerText })}
                onMouseDown={(e) => e.stopPropagation()}
                className="outline-none focus:ring-2 focus:ring-primary/40 rounded px-1 w-full h-full cursor-text"
                style={{
                  fontSize: el.size ? `${el.size}px` : (el.type === "heading" ? 40 : 18),
                  fontWeight: el.weight === "bold" || el.type === "heading" ? 700 : 400,
                  textAlign: el.align || "left",
                  color: el.color || undefined,
                  lineHeight: 1.25,
                }}
              >
                {el.content || ""}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
