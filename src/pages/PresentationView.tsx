import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, ArrowLeft, Maximize, Minimize,
  StickyNote, Loader2, Download, Pencil,
} from "lucide-react";
import SlideRenderer, { type Slide } from "@/components/presentation/SlideRenderer";
import { getTheme } from "@/lib/presentationThemes";
import { useAuth } from "@/hooks/useAuth";

export default function PresentationView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isEmbed = params.get("embed") === "1";
  const [current, setCurrent] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["presentation", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content")
        .select("id, title, description, presentation_data, creator_id, content_type")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const slides: Slide[] = useMemo(() => {
    const raw = data?.presentation_data?.slides;
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  const themeId: string = data?.presentation_data?.theme || data?.presentation_data?.meta?.theme || "teal";
  const theme = getTheme(themeId);
  const presentationKind: "slides" | "flashcards" =
    data?.presentation_data?.meta?.type === "flashcards" ? "flashcards" : "slides";
  const aspectClass = presentationKind === "flashcards" ? "aspect-square" : "aspect-video";
  const maxWidthClass = presentationKind === "flashcards" ? "max-w-[640px]" : "max-w-6xl";
  const isOwner = !!user && data?.creator_id === user.id;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") setCurrent((c) => Math.min(c + 1, slides.length - 1));
      if (e.key === "ArrowLeft") setCurrent((c) => Math.max(c - 1, 0));
      if (e.key === "n") setShowNotes((s) => !s);
      if (e.key === "f" || e.key === "F") toggleFs();
      if (e.key === "Escape" && document.fullscreenElement) document.exitFullscreen();
    };
    window.addEventListener("keydown", onKey);
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [slides.length]);

  const toggleFs = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
      else await document.exitFullscreen?.();
    } catch (e) { console.error("fullscreen error", e); }
  };

  const downloadPdf = async () => {
    if (exporting || slides.length === 0) return;
    setExporting(true);
    try {
      const [{ default: jsPDF }, html2canvasMod] = await Promise.all([
        import("jspdf"), import("html2canvas"),
      ]);
      const html2canvas = html2canvasMod.default;
      const isSquare = presentationKind === "flashcards";
      const pdf = isSquare
        ? new jsPDF({ orientation: "portrait", unit: "px", format: [1080, 1080] })
        : new jsPDF({ orientation: "landscape", unit: "px", format: [1280, 720] });

      const container = exportContainerRef.current!;
      for (let i = 0; i < slides.length; i++) {
        const slideEl = container.children[i] as HTMLElement;
        if (!slideEl) continue;
        const canvas = await html2canvas(slideEl, {
          scale: 1.5, backgroundColor: theme.bg, useCORS: true, logging: false,
          windowWidth: slideEl.offsetWidth, windowHeight: slideEl.offsetHeight,
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pageW, pageH);
      }
      pdf.save(`${(data?.title || "presentacion").replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF descargado");
    } catch (e: any) {
      console.error("pdf export", e);
      toast.error("No se pudo generar el PDF");
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data || data.content_type !== "presentacion" || slides.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3 px-4">
        <p className="text-muted-foreground text-sm">Presentación no encontrada o vacía.</p>
        {!isEmbed && <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /> Volver</Button>}
      </div>
    );
  }

  const slide = slides[current];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{data.title} · Presentación</title>
        <meta name="description" content={data.description || `Presentación: ${data.title}`} />
      </Helmet>

      {!isEmbed && (
        <header className="flex items-center gap-2 px-3 h-12 border-b shrink-0">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(-1)} aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-sm font-semibold flex-1 truncate" title={data.title}>{data.title}</h1>
          {isOwner && (
            <Button size="sm" variant="default" onClick={() => navigate(`/presentation/${id}/edit`)}>
              <Pencil className="h-4 w-4" /> <span className="hidden sm:inline ml-1">Editar</span>
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setShowNotes((s) => !s)}>
            <StickyNote className="h-4 w-4" /> {showNotes ? "Ocultar notas" : "Notas"}
          </Button>
          <Button size="sm" variant="ghost" onClick={downloadPdf} disabled={exporting} title="Descargar PDF">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="hidden sm:inline ml-1">{exporting ? "Generando…" : "PDF"}</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={toggleFs} title="Pantalla completa (F)">
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </header>
      )}

      <main className="flex-1 flex flex-col items-center justify-center bg-muted/20 p-3 md:p-6 overflow-hidden">
        <div ref={slideRef} className={`w-full ${maxWidthClass} ${aspectClass} rounded-xl border shadow-2xl overflow-hidden relative`}>
          <SlideRenderer slide={slide} themeId={themeId} />
          <span className="absolute bottom-3 right-4 text-[11px] font-mono opacity-70" style={{ color: theme.text }}>
            {current + 1} / {slides.length}
          </span>
        </div>

        {showNotes && slide.speaker_notes && (
          <div className={`w-full ${maxWidthClass} mt-3 p-3 rounded-lg border bg-card/60 text-xs md:text-sm`}>
            <p className="font-semibold text-primary mb-1 flex items-center gap-1.5"><StickyNote className="h-3.5 w-3.5" /> Notas del docente</p>
            <p className="text-muted-foreground leading-relaxed">{slide.speaker_notes}</p>
          </div>
        )}

        <div className="flex items-center gap-3 mt-4">
          <Button size="icon" variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">{current + 1} / {slides.length}</span>
          <Button size="icon" variant="outline" onClick={() => setCurrent((c) => Math.min(slides.length - 1, c + 1))} disabled={current === slides.length - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </main>

      {/* Off-screen container for PDF export */}
      <div
        ref={exportContainerRef}
        aria-hidden
        className="fixed -left-[10000px] top-0 pointer-events-none"
        style={{ width: presentationKind === "flashcards" ? 1080 : 1280 }}
      >
        {slides.map((s) => (
          <div key={s.id} style={{
            width: presentationKind === "flashcards" ? 1080 : 1280,
            height: presentationKind === "flashcards" ? 1080 : 720,
            position: "relative", overflow: "hidden",
          }}>
            <SlideRenderer slide={s} themeId={themeId} />
          </div>
        ))}
      </div>
    </div>
  );
}
