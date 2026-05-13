import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, ChevronRight, ArrowLeft, Maximize, Minimize,
  StickyNote, Loader2, Download, Presentation as PresentIcon,
} from "lucide-react";

type Slide = {
  id: string;
  order: number;
  layout: "title" | "title_bullets" | "two_column" | "quote" | "closing" | "image_full" | "image_left" | "image_right";
  title: string;
  subtitle?: string | null;
  bullets?: string[];
  left_column?: string[];
  right_column?: string[];
  quote?: string | null;
  quote_author?: string | null;
  speaker_notes?: string | null;
  image_url?: string | null;
  image_prompt?: string | null;
};

const SlideRenderer = ({ slide }: { slide: Slide }) => {
  const base = "w-full h-full p-10 md:p-14 flex flex-col justify-center";
  const img = slide.image_url;

  switch (slide.layout) {
    case "title":
      return (
        <div className={`${base} items-center text-center relative overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-background`}>
          {img && (
            <img
              src={img}
              alt=""
              loading="lazy"
              width={1280}
              height={720}
              className="absolute inset-0 w-full h-full object-cover opacity-25"
            />
          )}
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-6">Presentación</p>
            <h1 className="text-3xl md:text-6xl font-extrabold leading-tight">{slide.title}</h1>
            {slide.subtitle && <p className="mt-6 text-lg md:text-2xl text-muted-foreground max-w-3xl">{slide.subtitle}</p>}
          </div>
        </div>
      );

    case "image_full":
      return (
        <div className="w-full h-full relative overflow-hidden bg-black">
          {img && <img src={img} alt={slide.title} loading="lazy" width={1280} height={720} className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-14 text-white">
            <h2 className="text-2xl md:text-5xl font-extrabold drop-shadow-lg">{slide.title}</h2>
            {slide.subtitle && <p className="mt-3 text-base md:text-xl opacity-90 max-w-3xl">{slide.subtitle}</p>}
            {!!slide.bullets?.length && (
              <ul className="mt-4 space-y-1.5 text-sm md:text-base">
                {slide.bullets.slice(0, 3).map((b, i) => (
                  <li key={i} className="flex gap-2"><span>•</span><span>{b}</span></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      );

    case "image_left":
    case "image_right": {
      const reverse = slide.layout === "image_right";
      return (
        <div className={`w-full h-full grid grid-cols-1 md:grid-cols-2 ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
          <div className="relative bg-muted overflow-hidden min-h-[200px]">
            {img ? (
              <img src={img} alt={slide.title} loading="lazy" width={640} height={720} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
            )}
          </div>
          <div className="p-6 md:p-12 flex flex-col justify-center">
            <h2 className="text-xl md:text-3xl font-bold mb-4 md:mb-6">{slide.title}</h2>
            {slide.subtitle && <p className="text-sm md:text-base text-muted-foreground mb-4">{slide.subtitle}</p>}
            <ul className="space-y-2 md:space-y-3">
              {(slide.bullets || []).map((b, i) => (
                <li key={i} className="flex gap-2 text-sm md:text-lg leading-snug">
                  <span className="text-primary font-bold">•</span><span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    case "two_column":
      return (
        <div className={base}>
          <h2 className="text-2xl md:text-4xl font-bold mb-6 md:mb-10">{slide.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 flex-1">
            {[slide.left_column || [], slide.right_column || []].map((col, ci) => (
              <ul key={ci} className="space-y-3 md:space-y-4">
                {col.map((b, i) => (
                  <li key={i} className="flex gap-3 text-base md:text-xl leading-snug">
                    <span className="text-primary font-bold">•</span><span>{b}</span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      );

    case "quote":
      return (
        <div className={`${base} items-center text-center relative overflow-hidden bg-muted/30`}>
          {img && <img src={img} alt="" loading="lazy" width={1280} height={720} className="absolute inset-0 w-full h-full object-cover opacity-15" />}
          <div className="relative">
            <PresentIcon className="h-10 w-10 text-primary mb-6 opacity-50 mx-auto" />
            <blockquote className="text-2xl md:text-4xl font-serif italic leading-snug max-w-4xl">
              “{slide.quote || slide.title}”
            </blockquote>
            {slide.quote_author && <cite className="not-italic mt-6 text-base text-muted-foreground block">— {slide.quote_author}</cite>}
          </div>
        </div>
      );

    case "closing":
      return (
        <div className={`${base} items-center text-center relative overflow-hidden bg-gradient-to-tr from-primary/20 to-background`}>
          {img && <img src={img} alt="" loading="lazy" width={1280} height={720} className="absolute inset-0 w-full h-full object-cover opacity-20" />}
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4">{slide.title}</h2>
            {slide.subtitle && <p className="text-lg md:text-2xl text-muted-foreground max-w-3xl">{slide.subtitle}</p>}
            {!!slide.bullets?.length && (
              <ul className="mt-8 space-y-2 text-base md:text-xl text-left max-w-2xl mx-auto">
                {slide.bullets.map((b, i) => <li key={i}>• {b}</li>)}
              </ul>
            )}
          </div>
        </div>
      );

    case "title_bullets":
    default:
      return (
        <div className={`${base} ${img ? "" : ""}`}>
          <h2 className="text-2xl md:text-4xl font-bold mb-6 md:mb-8">{slide.title}</h2>
          <div className={img ? "grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 flex-1 items-center" : ""}>
            <ul className="space-y-3 md:space-y-5">
              {(slide.bullets || []).map((b, i) => (
                <li key={i} className="flex gap-3 text-base md:text-xl leading-snug">
                  <span className="text-primary font-bold">{i + 1}.</span><span>{b}</span>
                </li>
              ))}
            </ul>
            {img && (
              <img
                src={img}
                alt=""
                loading="lazy"
                width={400}
                height={400}
                className="hidden md:block w-64 h-64 object-cover rounded-xl shadow-lg"
              />
            )}
          </div>
        </div>
      );
  }
};

export default function PresentationView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isEmbed = params.get("embed") === "1";
  const [current, setCurrent] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") setCurrent((c) => Math.min(c + 1, slides.length - 1));
      if (e.key === "ArrowLeft") setCurrent((c) => Math.max(c - 1, 0));
      if (e.key === "n") setShowNotes((s) => !s);
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
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  };

  const exportMarkdown = () => {
    const md = slides.map((s, i) => {
      const parts = [`# Slide ${i + 1}: ${s.title}`];
      if (s.subtitle) parts.push(`_${s.subtitle}_`);
      if (s.bullets?.length) parts.push(s.bullets.map((b) => `- ${b}`).join("\n"));
      if (s.left_column?.length || s.right_column?.length) {
        parts.push("**Columna izquierda**\n" + (s.left_column || []).map((b) => `- ${b}`).join("\n"));
        parts.push("**Columna derecha**\n" + (s.right_column || []).map((b) => `- ${b}`).join("\n"));
      }
      if (s.quote) parts.push(`> ${s.quote}${s.quote_author ? ` — ${s.quote_author}` : ""}`);
      if (s.speaker_notes) parts.push(`\n_Notas:_ ${s.speaker_notes}`);
      return parts.join("\n\n");
    }).join("\n\n---\n\n");
    const blob = new Blob([`# ${data?.title || "Presentación"}\n\n${md}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(data?.title || "presentacion").replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
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
        {!isEmbed && (
          <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /> Volver</Button>
        )}
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
          <Button size="sm" variant="ghost" onClick={() => setShowNotes((s) => !s)}>
            <StickyNote className="h-4 w-4" /> {showNotes ? "Ocultar notas" : "Notas"}
          </Button>
          <Button size="sm" variant="ghost" onClick={exportMarkdown} title="Exportar a Markdown">
            <Download className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={toggleFs}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </header>
      )}

      <main className="flex-1 flex flex-col items-center justify-center bg-muted/20 p-3 md:p-6 overflow-hidden">
        <div className="w-full max-w-6xl aspect-video bg-card rounded-xl border shadow-2xl overflow-hidden relative">
          <SlideRenderer slide={slide} total={slides.length} index={current} presTitle={data.title} />
          <span className="absolute bottom-3 right-4 text-[11px] text-muted-foreground/70 font-mono">
            {current + 1} / {slides.length}
          </span>
        </div>

        {showNotes && slide.speaker_notes && (
          <div className="w-full max-w-6xl mt-3 p-3 rounded-lg border bg-card/60 text-xs md:text-sm">
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
    </div>
  );
}
