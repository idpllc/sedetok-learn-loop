import { useEffect, useRef, useState } from "react";
import SlideRenderer, { type Slide } from "./SlideRenderer";

type Props = {
  slide: Slide;
  themeId?: string;
  /** "16/9" (default) or "1/1" for flashcards. */
  aspect?: "16/9" | "1/1";
  className?: string;
};

/**
 * Renders a presentation slide at its native canvas size and scales it down
 * via CSS transform so the proportions and typography stay consistent with
 * the real presentation, while fitting any small container (cards, grids).
 */
export default function SlideThumbnail({ slide, themeId = "teal", aspect = "16/9", className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  const baseW = aspect === "1/1" ? 1080 : 1280;
  const baseH = aspect === "1/1" ? 1080 : 720;

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
        <SlideRenderer slide={slide} themeId={themeId} />
      </div>
    </div>
  );
}
