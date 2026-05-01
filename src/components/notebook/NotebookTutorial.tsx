import { useEffect, useLayoutEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, X, Sparkles, HelpCircle } from "lucide-react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "notebook_tutorial_completed_v1";
const TRIGGER_KEY = "notebook_tutorial_open";

type Step = {
  selector: string; // CSS selector, must match a data-tour attribute
  title: string;
  description: string;
  // Routes where the step can render. Match by startsWith.
  routePrefix: "/notebook" | "/notebook/";
  exactList?: boolean; // true => only on /notebook (list page); false/undefined => /notebook/:id
  placement?: "top" | "bottom" | "left" | "right" | "auto";
};

const STEPS: Step[] = [
  {
    selector: '[data-tour="create-notebook"]',
    title: "1. Crea tu primer cuaderno",
    description:
      "Pulsa aquí para crear un cuaderno. Cada cuaderno agrupa fuentes (PDF, texto, competencias del plan) y un chat con SEDE AI.",
    routePrefix: "/notebook",
    exactList: true,
    placement: "bottom",
  },
  {
    selector: '[data-tour="sources-panel"]',
    title: "2. Tus fuentes",
    description:
      "Aquí verás todas las fuentes del cuaderno. SEDE AI sólo responde con base en lo que tengas cargado en este panel.",
    routePrefix: "/notebook/",
    placement: "right",
  },
  {
    selector: '[data-tour="add-source"]',
    title: "3. Añade una fuente",
    description:
      "Sube un archivo (PDF, imagen, texto), pega un texto o vincula una competencia del plan de estudios. La fuente se procesa automáticamente.",
    routePrefix: "/notebook/",
    placement: "right",
  },
  {
    selector: '[data-tour="chat-panel"]',
    title: "4. Conversa con SEDE AI",
    description:
      "Haz preguntas, pide resúmenes o explicaciones. La IA usará tus fuentes como contexto para responderte.",
    routePrefix: "/notebook/",
    placement: "top",
  },
  {
    selector: '[data-tour="studio-panel"]',
    title: "5. Genera cápsulas con Studio",
    description:
      "Desde Studio puedes crear, con un clic, cápsulas a partir de tus fuentes: lecturas, mapas mentales, juegos y más.",
    routePrefix: "/notebook/",
    placement: "left",
  },
  {
    selector: '[data-tour="studio-quiz"]',
    title: "6. Crea un Quiz",
    description:
      "Pulsa Quiz para que SEDE AI genere preguntas a partir de tus fuentes y puedas autoevaluar lo aprendido.",
    routePrefix: "/notebook/",
    placement: "left",
  },
  {
    selector: '[data-tour="chat-input"]',
    title: "7. ¡Empieza a estudiar!",
    description:
      "Escribe aquí para pedirle a la IA explicaciones, resúmenes o ejercicios. Ya estás listo para estudiar con tu Notebook.",
    routePrefix: "/notebook/",
    placement: "top",
  },
];

const PADDING = 8;

function getStepRoute(step: Step, pathname: string): boolean {
  if (step.exactList) return pathname === "/notebook" || pathname === "/notebook/";
  // Detail route: /notebook/<id>
  return /^\/notebook\/[^/]+/.test(pathname);
}

export const NotebookTutorial = () => {
  const location = useLocation();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [, force] = useState(0);

  // Auto-start on first visit to /notebook (list)
  useEffect(() => {
    if (location.pathname !== "/notebook") return;
    try {
      const completed = localStorage.getItem(STORAGE_KEY) === "true";
      if (!completed) {
        const t = setTimeout(() => {
          setActive(true);
          setStepIndex(0);
        }, 800);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [location.pathname]);

  // Allow other components (e.g. help button) to open the tutorial
  useEffect(() => {
    const handler = () => {
      setStepIndex(0);
      setActive(true);
    };
    window.addEventListener(TRIGGER_KEY, handler);
    return () => window.removeEventListener(TRIGGER_KEY, handler);
  }, []);

  // Auto-advance from step 1 (create) when user lands on /notebook/:id
  useEffect(() => {
    if (!active) return;
    const isDetail = /^\/notebook\/[^/]+/.test(location.pathname);
    if (isDetail && stepIndex === 0) {
      setStepIndex(1);
    }
  }, [location.pathname, active, stepIndex]);

  const step = STEPS[stepIndex];
  const stepMatchesRoute = step ? getStepRoute(step, location.pathname) : false;

  const measure = useCallback(() => {
    if (!active || !step || !stepMatchesRoute) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    const r = el.getBoundingClientRect();
    setRect(r);
  }, [active, step, stepMatchesRoute]);

  useLayoutEffect(() => {
    measure();
  }, [measure, stepIndex, location.pathname]);

  // Re-measure on resize/scroll & poll briefly in case element mounts late
  useEffect(() => {
    if (!active) return;
    const onChange = () => force((n) => n + 1);
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    const interval = window.setInterval(() => measure(), 400);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
      window.clearInterval(interval);
    };
  }, [active, measure]);

  if (!active || !step) return null;

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
    setActive(false);
  };

  const handleNext = () => {
    if (stepIndex >= STEPS.length - 1) {
      finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  };
  const handlePrev = () => setStepIndex((i) => Math.max(0, i - 1));

  // If step belongs to a different route, render only a soft prompt overlay
  if (!stepMatchesRoute) {
    return createPortal(
      <div className="fixed inset-0 z-[95] pointer-events-none">
        <div className="absolute bottom-6 right-6 max-w-sm pointer-events-auto rounded-xl bg-background border shadow-2xl p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-pink mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1">Tutorial de Notebook</p>
              <p className="text-xs text-muted-foreground mb-3">
                {step.exactList
                  ? "Vuelve a la lista de cuadernos para continuar."
                  : "Abre un cuaderno para continuar el tutorial."}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={finish}>Cerrar</Button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  // Compute popover position
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const popW = Math.min(360, vw - 32);
  const popH = 200;
  let popTop = 0;
  let popLeft = 0;

  if (rect) {
    const placement = step.placement || "auto";
    const tryBottom = rect.bottom + 12;
    const tryTop = rect.top - popH - 12;
    const tryLeft = rect.left + rect.width / 2 - popW / 2;
    const tryRight = rect.right + 12;
    const tryLeftSide = rect.left - popW - 12;

    if (placement === "right" && tryRight + popW < vw - 16) {
      popLeft = tryRight;
      popTop = Math.max(16, Math.min(vh - popH - 16, rect.top));
    } else if (placement === "left" && tryLeftSide > 16) {
      popLeft = tryLeftSide;
      popTop = Math.max(16, Math.min(vh - popH - 16, rect.top));
    } else if (placement === "top" && tryTop > 16) {
      popTop = tryTop;
      popLeft = Math.max(16, Math.min(vw - popW - 16, tryLeft));
    } else {
      // bottom default
      popTop = Math.min(vh - popH - 16, tryBottom);
      popLeft = Math.max(16, Math.min(vw - popW - 16, tryLeft));
    }
  } else {
    popTop = vh / 2 - popH / 2;
    popLeft = vw / 2 - popW / 2;
  }

  // Build SVG mask to dim everything except the highlighted rect
  const highlight = rect
    ? {
        x: Math.max(0, rect.left - PADDING),
        y: Math.max(0, rect.top - PADDING),
        w: rect.width + PADDING * 2,
        h: rect.height + PADDING * 2,
      }
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[95]">
      {/* Dimmed overlay with a cut-out for the target */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={(e) => e.stopPropagation()}>
        <defs>
          <mask id="notebook-tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {highlight && (
              <rect
                x={highlight.x}
                y={highlight.y}
                width={highlight.w}
                height={highlight.h}
                rx={10}
                ry={10}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="hsl(0 0% 0% / 0.65)"
          mask="url(#notebook-tutorial-mask)"
        />
        {highlight && (
          <rect
            x={highlight.x}
            y={highlight.y}
            width={highlight.w}
            height={highlight.h}
            rx={10}
            ry={10}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            className="animate-pulse"
          />
        )}
      </svg>

      {/* Popover card */}
      <div
        className="absolute rounded-xl bg-background border shadow-2xl p-4 pointer-events-auto"
        style={{ top: popTop, left: popLeft, width: popW }}
        role="dialog"
        aria-label={step.title}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-pink" />
            <span className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
              Paso {stepIndex + 1} de {STEPS.length}
            </span>
          </div>
          <button
            onClick={finish}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Cerrar tutorial"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="font-semibold text-base mb-1">{step.title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
        <div className="flex items-center justify-between gap-2">
          <Button size="sm" variant="ghost" onClick={finish}>
            Saltar
          </Button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button size="sm" variant="outline" onClick={handlePrev} className="gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Atrás
              </Button>
            )}
            <Button size="sm" onClick={handleNext} variant="pink" className="gap-1">
              {stepIndex === STEPS.length - 1 ? "Finalizar" : "Siguiente"}
              {stepIndex !== STEPS.length - 1 && <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

/** Floating help button to relaunch the tutorial. */
export const NotebookTutorialHelpButton = () => {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(TRIGGER_KEY))}
      className="fixed bottom-4 left-4 z-40 h-10 w-10 rounded-full bg-pink text-pink-foreground shadow-lg hover:opacity-90 flex items-center justify-center"
      aria-label="Ver tutorial de Notebook"
      title="Ver tutorial de Notebook"
    >
      <HelpCircle className="h-5 w-5" />
    </button>
  );
};
