// Presentation themes — each provides background + card surface + text colors
// chosen so contrast is guaranteed (WCAG AA). Used by SlideRenderer and the
// editor's "Temas" panel.

export type PresentationTheme = {
  id: string;
  name: string;
  // Backgrounds
  bg: string;            // page/slide background
  cardBg: string;        // card surface
  cardBorder: string;    // optional card border
  // Foregrounds
  text: string;          // primary text on bg
  textOnCard: string;    // primary text on cardBg
  mutedText: string;     // secondary text on bg
  mutedOnCard: string;   // secondary text on cardBg
  accent: string;        // headings / icons
  accentOnCard: string;  // bold inside cards
  // Hex preview swatches (for the theme picker)
  swatch: [string, string, string];
};

export const PRESENTATION_THEMES: Record<string, PresentationTheme> = {
  teal: {
    id: "teal",
    name: "Verde Azulado",
    bg: "#0E7C6E",
    cardBg: "#0B6258",
    cardBorder: "rgba(255,255,255,0.06)",
    text: "#FFFFFF",
    textOnCard: "#E6F7F4",
    mutedText: "rgba(255,255,255,0.85)",
    mutedOnCard: "rgba(230,247,244,0.85)",
    accent: "#FFFFFF",
    accentOnCard: "#FFFFFF",
    swatch: ["#0E7C6E", "#0B6258", "#FFFFFF"],
  },
  indigo: {
    id: "indigo",
    name: "Índigo Profundo",
    bg: "#1E1B4B",
    cardBg: "#312E81",
    cardBorder: "rgba(255,255,255,0.08)",
    text: "#FFFFFF",
    textOnCard: "#EEF2FF",
    mutedText: "rgba(238,242,255,0.8)",
    mutedOnCard: "rgba(238,242,255,0.85)",
    accent: "#A5B4FC",
    accentOnCard: "#FFFFFF",
    swatch: ["#1E1B4B", "#312E81", "#A5B4FC"],
  },
  cream: {
    id: "cream",
    name: "Crema",
    bg: "#FAF7F0",
    cardBg: "#FFFFFF",
    cardBorder: "rgba(0,0,0,0.06)",
    text: "#1F2937",
    textOnCard: "#1F2937",
    mutedText: "#4B5563",
    mutedOnCard: "#4B5563",
    accent: "#B45309",
    accentOnCard: "#B45309",
    swatch: ["#FAF7F0", "#FFFFFF", "#B45309"],
  },
  slate: {
    id: "slate",
    name: "Slate",
    bg: "#0F172A",
    cardBg: "#1E293B",
    cardBorder: "rgba(255,255,255,0.06)",
    text: "#F1F5F9",
    textOnCard: "#F8FAFC",
    mutedText: "rgba(241,245,249,0.75)",
    mutedOnCard: "rgba(248,250,252,0.8)",
    accent: "#38BDF8",
    accentOnCard: "#FFFFFF",
    swatch: ["#0F172A", "#1E293B", "#38BDF8"],
  },
  coral: {
    id: "coral",
    name: "Coral",
    bg: "#7C2D12",
    cardBg: "#9A3412",
    cardBorder: "rgba(255,255,255,0.08)",
    text: "#FFF7ED",
    textOnCard: "#FFEDD5",
    mutedText: "rgba(255,247,237,0.85)",
    mutedOnCard: "rgba(255,237,213,0.9)",
    accent: "#FED7AA",
    accentOnCard: "#FFFFFF",
    swatch: ["#7C2D12", "#9A3412", "#FED7AA"],
  },
  forest: {
    id: "forest",
    name: "Bosque",
    bg: "#14532D",
    cardBg: "#166534",
    cardBorder: "rgba(255,255,255,0.06)",
    text: "#F0FDF4",
    textOnCard: "#DCFCE7",
    mutedText: "rgba(240,253,244,0.85)",
    mutedOnCard: "rgba(220,252,231,0.9)",
    accent: "#86EFAC",
    accentOnCard: "#FFFFFF",
    swatch: ["#14532D", "#166534", "#86EFAC"],
  },
  light: {
    id: "light",
    name: "Claro Minimal",
    bg: "#FFFFFF",
    cardBg: "#F3F4F6",
    cardBorder: "rgba(0,0,0,0.08)",
    text: "#111827",
    textOnCard: "#111827",
    mutedText: "#6B7280",
    mutedOnCard: "#4B5563",
    accent: "#2563EB",
    accentOnCard: "#2563EB",
    swatch: ["#FFFFFF", "#F3F4F6", "#2563EB"],
  },
  dark: {
    id: "dark",
    name: "Oscuro",
    bg: "#000000",
    cardBg: "#171717",
    cardBorder: "rgba(255,255,255,0.08)",
    text: "#FAFAFA",
    textOnCard: "#FAFAFA",
    mutedText: "rgba(250,250,250,0.7)",
    mutedOnCard: "rgba(250,250,250,0.75)",
    accent: "#F6339A",
    accentOnCard: "#F6339A",
    swatch: ["#000000", "#171717", "#F6339A"],
  },
};

export const DEFAULT_THEME_ID = "teal";

export const getTheme = (id?: string | null): PresentationTheme =>
  PRESENTATION_THEMES[id || DEFAULT_THEME_ID] || PRESENTATION_THEMES[DEFAULT_THEME_ID];

export type SlideBackground =
  | { type: "color"; value: string }
  | { type: "gradient"; value: string }
  | { type: "image"; value: string }
  | null
  | undefined;

export const backgroundStyle = (
  bg: SlideBackground,
  fallback: string,
): React.CSSProperties => {
  if (!bg) return { background: fallback };
  if (bg.type === "color") return { background: bg.value };
  if (bg.type === "gradient") return { background: bg.value };
  if (bg.type === "image")
    return {
      backgroundImage: `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)), url(${bg.value})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  return { background: fallback };
};
