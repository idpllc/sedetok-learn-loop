import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SlideRenderer, { type Slide } from "./SlideRenderer";

type Props = {
  /** Pass a slide directly if already available. */
  slide?: Slide | null;
  /** Or pass a content id and the thumbnail will lazy-fetch the first slide. */
  contentId?: string;
  themeId?: string;
  /** "16/9" (default) or "1/1" for flashcards. */
  aspect?: "16/9" | "1/1";
  className?: string;
};

/**
 * Renders a presentation's first slide at native canvas size and scales it
 * down via CSS transform so proportions/typography match the real
 * presentation while fitting any small container (cards, grids).
 *
 * When given only `contentId`, lazy-fetches the presentation_data once and
 * caches it via react-query so feed listings can stay lightweight.
 */
export default function SlideThumbnail({
  slide,
  contentId,
  themeId,
  aspect = "16/9",
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  const baseW = aspect === "1/1" ? 1080 : 1280;
  const baseH = aspect === "1/1" ? 1080 : 720;

  const { data: fetched } = useQuery({
    queryKey: ["presentation-thumb", contentId],
    enabled: !slide && !!contentId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content")
        .select("presentation_data")
        .eq("id", contentId!)
        .maybeSingle();
      if (error) throw error;
      return data?.presentation_data as any;
    },
  });

  const effectiveSlide: Slide | null =
    slide ||
    (Array.isArray(fetched?.slides) && fetched.slides.length > 0 ? fetched.slides[0] : null);
  const effectiveTheme =
    themeId || fetched?.theme || fetched?.meta?.theme || "teal";
  const effectiveAspect: "16/9" | "1/1" =
    aspect || (fetched?.meta?.type === "flashcards" ? "1/1" : "16/9");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      setScale(Math.min(width / baseW, height / baseH));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [baseW, baseH]);

  if (!effectiveSlide) {
    return (
      <div className={`absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 ${className}`} />
    );
  }

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden ${className}`}>
      <div
        style={{
          width: baseW,
          height: baseH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <SlideRenderer slide={effectiveSlide} themeId={effectiveTheme} />
      </div>
    </div>
  );
}
