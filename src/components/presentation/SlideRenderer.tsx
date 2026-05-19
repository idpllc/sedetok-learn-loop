import { getTheme, backgroundStyle, type SlideBackground } from "@/lib/presentationThemes";
import { getSlideIcon } from "@/lib/presentationIcons";
import { Quote as QuoteIcon } from "lucide-react";
import type { CSSProperties } from "react";

export type SlideCard = {
  icon?: string;
  title: string;
  body: string;
  image_url?: string | null;
};

export type SlideLayout =
  | "title" | "title_bullets" | "two_column" | "quote" | "closing"
  | "image_full" | "image_left" | "image_right"
  | "cards_2" | "cards_3" | "cards_4" | "cards_image" | "section_header";

export type SlideElement = {
  id: string;
  type: "heading" | "text" | "image";
  x: number; // % of slide width (0-100)
  y: number; // % of slide height (0-100)
  w: number; // % of slide width
  h?: number; // % of slide height (optional, for images)
  content?: string; // for heading/text
  src?: string; // for image
  align?: "left" | "center" | "right";
  color?: string;
  size?: number; // px (relative to 720h slide)
  weight?: "normal" | "bold";
};

export type Slide = {
  id: string;
  order: number;
  layout: SlideLayout;
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
  cards?: SlideCard[];
  background?: SlideBackground;
  elements?: SlideElement[];
};

// Inline markdown: **bold**, *italic*, `code`
const renderInline = (text: string): (string | JSX.Element)[] => {
  if (!text) return [];
  const parts: (string | JSX.Element)[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2] !== undefined) parts.push(<strong key={key++} className="font-bold">{m[2]}</strong>);
    else if (m[3] !== undefined) parts.push(<em key={key++} className="italic">{m[3]}</em>);
    else if (m[4] !== undefined) parts.push(<code key={key++} className="font-mono px-1 rounded" style={{ background: "rgba(127,127,127,0.2)" }}>{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
};
export const RT = ({ children }: { children?: string | null }) => <>{renderInline(children || "")}</>;

type Props = { slide: Slide; themeId?: string | null };

export default function SlideRenderer({ slide, themeId }: Props) {
  const theme = getTheme(themeId);
  const img = slide.image_url || undefined;

  const slideStyle: CSSProperties = {
    ...backgroundStyle(slide.background, theme.bg),
    color: theme.text,
  };
  const cardStyle: CSSProperties = {
    background: theme.cardBg,
    color: theme.textOnCard,
    borderColor: theme.cardBorder,
  };
  const mutedStyle: CSSProperties = { color: theme.mutedText };
  const mutedOnCardStyle: CSSProperties = { color: theme.mutedOnCard };
  const accentStyle: CSSProperties = { color: theme.accent };

  const Wrap = ({ children, className = "" }: { children: any; className?: string }) => (
    <div className={`w-full h-full relative overflow-hidden ${className}`} style={slideStyle}>
      {children}
    </div>
  );

  const cards = (slide.cards && slide.cards.length > 0)
    ? slide.cards
    : [];

  switch (slide.layout) {
    case "title":
      return (
        <Wrap className="flex items-center text-center px-12 py-14">
          {img && <img src={img} alt="" loading="lazy" width={1280} height={720}
            className="absolute inset-0 w-full h-full object-cover opacity-20" crossOrigin="anonymous" />}
          <div className="relative w-full">
            <p className="text-xs uppercase tracking-[0.3em] mb-6" style={accentStyle}>Presentación</p>
            <h1 className="text-3xl md:text-6xl font-extrabold leading-tight" style={{ color: theme.text }}>
              <RT>{slide.title}</RT>
            </h1>
            {slide.subtitle && (
              <p className="mt-6 text-lg md:text-2xl max-w-3xl mx-auto" style={mutedStyle}>
                <RT>{slide.subtitle}</RT>
              </p>
            )}
          </div>
        </Wrap>
      );

    case "section_header":
      return (
        <Wrap className="flex flex-col items-center justify-center text-center px-12 py-14">
          {img && <img src={img} alt="" loading="lazy" width={1280} height={720}
            className="absolute inset-0 w-full h-full object-cover opacity-15" crossOrigin="anonymous" />}
          <div className="relative">
            <p className="text-sm md:text-lg uppercase tracking-[0.4em] mb-4 opacity-70" style={accentStyle}>
              {slide.subtitle || "Sección"}
            </p>
            <h2 className="text-4xl md:text-7xl font-black leading-tight">
              <RT>{slide.title}</RT>
            </h2>
          </div>
        </Wrap>
      );

    case "cards_2":
    case "cards_3":
    case "cards_4": {
      const n = slide.layout === "cards_2" ? 2 : slide.layout === "cards_4" ? 4 : 3;
      const list = (cards.length ? cards : Array.from({ length: n }, (_, i) => ({
        title: `Tarjeta ${i + 1}`, body: "Contenido", icon: "sparkles",
      }))).slice(0, n);
      const gridCls = n === 2 ? "md:grid-cols-2" : n === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3";
      return (
        <Wrap className="flex flex-col px-8 md:px-14 py-10 md:py-12">
          <h2 className="text-2xl md:text-5xl font-extrabold mb-6 md:mb-10 text-center md:text-left">
            <RT>{slide.title}</RT>
          </h2>
          <div className={`grid grid-cols-1 ${gridCls} gap-4 md:gap-6 flex-1 min-h-0`}>
            {list.map((c, i) => {
              const Icon = getSlideIcon(c.icon);
              return (
                <div key={i} className="rounded-2xl border p-5 md:p-7 flex flex-col" style={cardStyle}>
                  <Icon className="h-7 w-7 md:h-9 md:w-9 mb-4 opacity-90" style={{ color: theme.accentOnCard }} />
                  <h3 className="text-base md:text-xl font-bold mb-2 md:mb-3" style={{ color: theme.textOnCard }}>
                    <RT>{c.title}</RT>
                  </h3>
                  <p className="text-sm md:text-base leading-snug" style={mutedOnCardStyle}>
                    <RT>{c.body}</RT>
                  </p>
                </div>
              );
            })}
          </div>
        </Wrap>
      );
    }

    case "cards_image": {
      const list = (cards.length ? cards : Array.from({ length: 3 }, (_, i) => ({
        title: `Tarjeta ${i + 1}`, body: "Contenido", icon: "sparkles",
      }))).slice(0, 3);
      return (
        <Wrap className="flex flex-col px-8 md:px-14 py-10 md:py-12">
          <h2 className="text-2xl md:text-5xl font-extrabold mb-6 md:mb-10 text-center">
            <RT>{slide.title}</RT>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 flex-1 min-h-0">
            {list.map((c, i) => (
              <div key={i} className="rounded-2xl border overflow-hidden flex flex-col" style={cardStyle}>
                <div className="aspect-[4/3] bg-black/20 overflow-hidden">
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.title} loading="lazy" width={400} height={300}
                      className="w-full h-full object-cover" crossOrigin="anonymous" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-50">
                      {(() => { const Icon = getSlideIcon(c.icon); return <Icon className="h-12 w-12" />; })()}
                    </div>
                  )}
                </div>
                <div className="p-5 md:p-6">
                  <h3 className="text-base md:text-xl font-bold mb-2" style={{ color: theme.textOnCard }}>
                    <RT>{c.title}</RT>
                  </h3>
                  <p className="text-sm md:text-base leading-snug" style={mutedOnCardStyle}>
                    <RT>{c.body}</RT>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Wrap>
      );
    }

    case "image_full":
      return (
        <div className="w-full h-full relative overflow-hidden bg-black">
          {img && <img src={img} alt={slide.title} loading="lazy" width={1280} height={720}
            className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-14 text-white">
            <h2 className="text-2xl md:text-5xl font-extrabold drop-shadow-lg"><RT>{slide.title}</RT></h2>
            {slide.subtitle && <p className="mt-3 text-base md:text-xl opacity-90 max-w-3xl"><RT>{slide.subtitle}</RT></p>}
          </div>
        </div>
      );

    case "image_left":
    case "image_right": {
      const reverse = slide.layout === "image_right";
      return (
        <Wrap className={`grid grid-cols-1 md:grid-cols-2 ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
          <div className="relative overflow-hidden min-h-[200px]" style={{ background: theme.cardBg }}>
            {img ? (
              <img src={img} alt={slide.title} loading="lazy" width={640} height={720}
                className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" />
            ) : null}
          </div>
          <div className="p-6 md:p-12 flex flex-col justify-center">
            <h2 className="text-xl md:text-4xl font-bold mb-4 md:mb-6"><RT>{slide.title}</RT></h2>
            {slide.subtitle && <p className="text-sm md:text-lg mb-4" style={mutedStyle}><RT>{slide.subtitle}</RT></p>}
            <ul className="space-y-2 md:space-y-3">
              {(slide.bullets || []).map((b, i) => (
                <li key={i} className="flex gap-2 text-sm md:text-lg leading-snug">
                  <span className="font-bold" style={accentStyle}>•</span><span><RT>{b}</RT></span>
                </li>
              ))}
            </ul>
          </div>
        </Wrap>
      );
    }

    case "two_column":
      return (
        <Wrap className="flex flex-col px-8 md:px-14 py-10 md:py-12">
          <h2 className="text-2xl md:text-4xl font-bold mb-6 md:mb-10"><RT>{slide.title}</RT></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 flex-1">
            {[slide.left_column || [], slide.right_column || []].map((col, ci) => (
              <ul key={ci} className="space-y-3 md:space-y-4">
                {col.map((b, i) => (
                  <li key={i} className="flex gap-3 text-base md:text-xl leading-snug">
                    <span className="font-bold" style={accentStyle}>•</span><span><RT>{b}</RT></span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </Wrap>
      );

    case "quote":
      return (
        <Wrap className="flex items-center justify-center text-center px-12 py-14">
          {img && <img src={img} alt="" loading="lazy" width={1280} height={720}
            className="absolute inset-0 w-full h-full object-cover opacity-15" crossOrigin="anonymous" />}
          <div className="relative max-w-4xl">
            <QuoteIcon className="h-10 w-10 mb-6 opacity-50 mx-auto" style={accentStyle} />
            <blockquote className="text-2xl md:text-4xl font-serif italic leading-snug">
              "<RT>{slide.quote || slide.title}</RT>"
            </blockquote>
            {slide.quote_author && <cite className="not-italic mt-6 text-base block" style={mutedStyle}>— {slide.quote_author}</cite>}
          </div>
        </Wrap>
      );

    case "closing":
      return (
        <Wrap className="flex items-center justify-center text-center px-12 py-14">
          {img && <img src={img} alt="" loading="lazy" width={1280} height={720}
            className="absolute inset-0 w-full h-full object-cover opacity-15" crossOrigin="anonymous" />}
          <div className="relative">
            <h2 className="text-3xl md:text-6xl font-extrabold mb-4"><RT>{slide.title}</RT></h2>
            {slide.subtitle && <p className="text-lg md:text-2xl max-w-3xl mx-auto" style={mutedStyle}><RT>{slide.subtitle}</RT></p>}
            {!!slide.bullets?.length && (
              <ul className="mt-8 space-y-2 text-base md:text-xl text-left max-w-2xl mx-auto">
                {slide.bullets.map((b, i) => <li key={i}>• <RT>{b}</RT></li>)}
              </ul>
            )}
          </div>
        </Wrap>
      );

    case "title_bullets":
    default:
      return (
        <Wrap className="flex flex-col px-8 md:px-14 py-10 md:py-12">
          <h2 className="text-2xl md:text-4xl font-bold mb-6 md:mb-8"><RT>{slide.title}</RT></h2>
          <div className={img ? "grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 flex-1 items-center" : "flex-1"}>
            <ul className="space-y-3 md:space-y-5">
              {(slide.bullets || []).map((b, i) => (
                <li key={i} className="flex gap-3 text-base md:text-xl leading-snug">
                  <span className="font-bold" style={accentStyle}>{i + 1}.</span><span><RT>{b}</RT></span>
                </li>
              ))}
            </ul>
            {img && (
              <img src={img} alt="" loading="lazy" width={400} height={400}
                className="hidden md:block w-64 h-64 object-cover rounded-xl shadow-lg" crossOrigin="anonymous" />
            )}
          </div>
        </Wrap>
      );
  }
}
