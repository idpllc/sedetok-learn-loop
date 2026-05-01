import { useEffect, useLayoutEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, X, Sparkles, HelpCircle } from "lucide-react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "notebook_tutorial_completed_v5";
const STATE_KEY = "notebook_tutorial_state_v1";
const TRIGGER_KEY = "notebook_tutorial_open";

type StepAction = {
  // Fired when user clicks "Siguiente" — useful to open dialogs / switch tabs.
  event?: string;
  payload?: Record<string, unknown>;
};

type Step = {
  selector: string;
  title: string;
  description: string;
  routeMatcher: (pathname: string) => boolean;
  placement?: "top" | "bottom" | "left" | "right";
  // If true, the highlighted element receives clicks (overlay is click-through there).
  allowInteraction?: boolean;
  // Hide the "Siguiente" button — the user must interact with the highlighted element.
  hideNext?: boolean;
  // Run when the user (or auto-advance) leaves this step going forward.
  onAdvance?: StepAction;
  // Run when the step becomes active (e.g., open the AddSource dialog with a tab).
  onEnter?: StepAction;
  // Optional auto-advance condition (polled). If returns true, move to next step.
  shouldAutoAdvance?: () => boolean;
};

const isDetailRoute = (p: string) => /^\/notebook\/[^/]+/.test(p);
const isListRoute = (p: string) => p === "/notebook" || p === "/notebook/";

const STEPS: Step[] = [
  {
    selector: '[data-tour="create-notebook"]',
    title: "1. Crea tu primer cuaderno",
    description:
      "Pulsa el botón resaltado para crear un cuaderno. Cada cuaderno agrupa fuentes (texto, archivos, competencias) y un chat con SEDE AI.",
    routeMatcher: isListRoute,
    placement: "bottom",
    allowInteraction: true,
    hideNext: true, // user must click the button
    shouldAutoAdvance: () => isDetailRoute(window.location.pathname),
  },
  {
    selector: '[data-tour="source-text-form"]',
    title: "2. Añade tu primera fuente",
    description:
      "Vamos a crear una fuente de tipo Texto. En el campo TÍTULO pondrás el nombre de la asignatura, y en CONTENIDO la competencia o temática que quieres aprender.",
    routeMatcher: isDetailRoute,
    placement: "right",
    allowInteraction: true,
    onEnter: { event: "notebook:open-add-source", payload: { tab: "text" } },
  },
  {
    selector: '[data-tour="source-text-title"]',
    title: "3. Escribe el título: la asignatura",
    description:
      "👉 Escribe aquí el nombre de la asignatura (por ejemplo: 'Matemáticas', 'Biología' o 'Lengua').",
    routeMatcher: isDetailRoute,
    placement: "bottom",
    allowInteraction: true,
    onEnter: { event: "notebook:open-add-source", payload: { tab: "text" } },
  },
  {
    selector: '[data-tour="source-text-content"]',
    title: "4. Escribe el contenido: la competencia o temática",
    description:
      "👉 Escribe aquí la competencia o temática que quieres aprender (ej: 'Resolver ecuaciones lineales' o 'Comprender la fotosíntesis').",
    routeMatcher: isDetailRoute,
    placement: "top",
    allowInteraction: true,
    onEnter: { event: "notebook:open-add-source", payload: { tab: "text" } },
  },
  {
    selector: '[data-tour="source-text-submit"]',
    title: "5. Añade tu fuente",
    description:
      "Pulsa 'Añadir texto'. SEDE AI procesará tu fuente para usarla como contexto en todo el cuaderno.",
    routeMatcher: isDetailRoute,
    placement: "top",
    allowInteraction: true,
    hideNext: true,
    onEnter: { event: "notebook:open-add-source", payload: { tab: "text" } },
    shouldAutoAdvance: () => {
      // Advance when the AddSource dialog closes (no longer in DOM).
      return !document.querySelector('[data-tour="source-text-submit"]');
    },
  },
  {
    selector: '[data-tour="sources-panel"]',
    title: "6. Tu fuente procesada",
    description:
      "¡Listo! Tu fuente aparecerá aquí en cuanto termine de procesarse. SEDE AI ya puede usarla para responderte.",
    routeMatcher: isDetailRoute,
    placement: "right",
  },
  {
    selector: '[data-tour="studio-panel"]',
    title: "7. Studio: tu fábrica de cápsulas",
    description:
      "Desde Studio puedes transformar tus fuentes en cápsulas de estudio: lecturas, mapas mentales, juegos y quizzes.",
    routeMatcher: isDetailRoute,
    placement: "left",
    onEnter: { event: "notebook:set-mobile-tab", payload: { tab: "studio" } },
  },
  {
    selector: '[data-tour="studio-mindmap"]',
    title: "8. Selecciona Mapa mental",
    description:
      "Empecemos por un Mapa mental: visualiza el tema de tu fuente como un esquema con conceptos conectados. Pulsa el botón resaltado para seleccionarlo.",
    routeMatcher: isDetailRoute,
    placement: "left",
    allowInteraction: true,
    hideNext: true,
    // Advance when the user actually activates the mindmap option (search results appear)
    shouldAutoAdvance: () => {
      const btn = document.querySelector('[data-tour="studio-mindmap"]') as HTMLElement | null;
      return !!btn && btn.className.includes("ring-2");
    },
  },
  {
    selector: '[data-tour="studio-panel"]',
    title: "9. Cápsulas existentes en Sedefy",
    description:
      "Sedefy busca automáticamente mapas mentales ya creados por la comunidad sobre tu tema. Puedes pulsar 'Buscar más' para ver más resultados o usar uno directamente.",
    routeMatcher: isDetailRoute,
    placement: "left",
    allowInteraction: true,
  },
  {
    selector: '[data-tour="studio-generate-ai"]',
    title: "10. O genera tu propio mapa mental con IA",
    description:
      "Si prefieres uno hecho a tu medida, pulsa 'Generar mapa mental con IA'. SEDE AI creará un mapa mental personalizado a partir de tu fuente.",
    routeMatcher: isDetailRoute,
    placement: "left",
    allowInteraction: true,
  },
  {
    selector: '[data-tour="chat-panel"]',
    title: "11. Conversa con SEDE AI",
    description:
      "Vuelve al chat cuando quieras pedirle resúmenes, explicaciones o ejercicios sobre tu fuente. La IA responde usando tus fuentes como contexto.",
    routeMatcher: isDetailRoute,
    placement: "top",
    onEnter: { event: "notebook:set-mobile-tab", payload: { tab: "chat" } },
  },
  {
    selector: '[data-tour="chat-input"]',
    title: "12. ¡Empieza a estudiar!",
    description:
      "Escribe aquí tu pregunta. Ya tienes todo lo necesario para estudiar con tu Notebook Sedefy.",
    routeMatcher: isDetailRoute,
    placement: "top",
    allowInteraction: true,
  },
];

const PADDING = 8;

const dispatchAction = (action?: StepAction) => {
  if (!action?.event) return;
  window.dispatchEvent(new CustomEvent(action.event, { detail: action.payload }));
};

export const NotebookTutorial = () => {
  const location = useLocation();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [, force] = useState(0);
  const enteredRef = useRef<number>(-1);

  const firstStepForRoute = useCallback((pathname: string) => {
    const index = STEPS.findIndex((s) => s.routeMatcher(pathname));
    return Math.max(0, index);
  }, []);

  // Auto-start once when entering /notebook, or resume after creating a notebook.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { active?: boolean; stepIndex?: number };
        if (parsed.active) {
          const nextIndex = STEPS[parsed.stepIndex || 0]?.routeMatcher(location.pathname)
            ? parsed.stepIndex || 0
            : firstStepForRoute(location.pathname);
          setStepIndex(nextIndex);
          setActive(true);
          return;
        }
      }
      const completed = localStorage.getItem(STORAGE_KEY) === "true";
      if (!completed && isListRoute(location.pathname)) {
        const t = setTimeout(() => {
          setStepIndex(0);
          setActive(true);
        }, 800);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [firstStepForRoute, location.pathname]);

  useEffect(() => {
    try {
      if (active) sessionStorage.setItem(STATE_KEY, JSON.stringify({ active: true, stepIndex }));
      else sessionStorage.removeItem(STATE_KEY);
    } catch {}
  }, [active, stepIndex]);

  // Manual relaunch
  useEffect(() => {
    const handler = () => {
      setStepIndex(firstStepForRoute(location.pathname));
      setActive(true);
    };
    window.addEventListener(TRIGGER_KEY, handler);
    return () => window.removeEventListener(TRIGGER_KEY, handler);
  }, [firstStepForRoute, location.pathname]);

  const step = STEPS[stepIndex];
  const stepMatchesRoute = step ? step.routeMatcher(location.pathname) : false;

  // Run onEnter when step becomes active (and route matches)
  useEffect(() => {
    if (!active || !step || !stepMatchesRoute) return;
    if (enteredRef.current === stepIndex) return;
    enteredRef.current = stepIndex;
    if (step.onEnter) {
      // Slight delay so previous UI settles
      const t = setTimeout(() => dispatchAction(step.onEnter), 60);
      return () => clearTimeout(t);
    }
  }, [active, step, stepIndex, stepMatchesRoute]);

  // If a resumed step belongs to another route, jump to the first valid step here.
  useEffect(() => {
    if (!active || !step || stepMatchesRoute) return;
    setStepIndex(firstStepForRoute(location.pathname));
  }, [active, firstStepForRoute, location.pathname, step, stepMatchesRoute]);

  // Auto-advance polling
  useEffect(() => {
    if (!active || !step?.shouldAutoAdvance) return;
    const id = window.setInterval(() => {
      try {
        if (step.shouldAutoAdvance && step.shouldAutoAdvance()) {
          setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
        }
      } catch {}
    }, 350);
    return () => window.clearInterval(id);
  }, [active, step]);

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
    const r = el.getBoundingClientRect();
    setRect(r);
  }, [active, step, stepMatchesRoute]);

  useLayoutEffect(() => {
    measure();
  }, [measure, stepIndex, location.pathname]);

  useEffect(() => {
    if (!active) return;
    const onChange = () => force((n) => n + 1);
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    const interval = window.setInterval(() => measure(), 300);
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
      sessionStorage.removeItem(STATE_KEY);
    } catch {}
    setActive(false);
  };

  const handleNext = () => {
    if (step.onAdvance) dispatchAction(step.onAdvance);
    if (stepIndex >= STEPS.length - 1) {
      finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  };
  const handlePrev = () => setStepIndex((i) => Math.max(0, i - 1));

  // If step's route doesn't match, show a soft prompt
  if (!stepMatchesRoute) {
    return createPortal(
      <div className="fixed inset-0 z-[95] pointer-events-none">
        <div className="absolute bottom-6 right-6 max-w-sm pointer-events-auto rounded-xl bg-background border shadow-2xl p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-pink mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1">Tutorial en pausa</p>
              <p className="text-xs text-muted-foreground mb-3">
                Vuelve a la sección de Notebook para continuar el tutorial paso a paso.
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

  // Position popover
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const popW = Math.min(360, vw - 32);
  const popH = 220;
  let popTop = 0;
  let popLeft = 0;

  if (rect) {
    const placement = step.placement || "bottom";
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
      popTop = Math.min(vh - popH - 16, tryBottom);
      popLeft = Math.max(16, Math.min(vw - popW - 16, tryLeft));
    }
  } else {
    popTop = vh / 2 - popH / 2;
    popLeft = vw / 2 - popW / 2;
  }

  const highlight = rect
    ? {
        x: Math.max(0, rect.left - PADDING),
        y: Math.max(0, rect.top - PADDING),
        w: rect.width + PADDING * 2,
        h: rect.height + PADDING * 2,
      }
    : null;

  // The 4 dimming rectangles around the highlight (so the highlight area
  // remains fully click-through and pixel-precise).
  const dimRects = highlight
    ? [
        { x: 0, y: 0, w: vw, h: highlight.y }, // top
        { x: 0, y: highlight.y + highlight.h, w: vw, h: Math.max(0, vh - (highlight.y + highlight.h)) }, // bottom
        { x: 0, y: highlight.y, w: highlight.x, h: highlight.h }, // left
        {
          x: highlight.x + highlight.w,
          y: highlight.y,
          w: Math.max(0, vw - (highlight.x + highlight.w)),
          h: highlight.h,
        }, // right
      ]
    : [{ x: 0, y: 0, w: vw, h: vh }];

  const allowInteraction = !!step.allowInteraction;

  return createPortal(
    <div className="fixed inset-0 z-[95] pointer-events-none">
      {/* Dimming layers — these block clicks. The highlight gap does NOT, so
          the user can click the real element. */}
      {dimRects.map((d, i) => (
        <div
          key={i}
          className="absolute bg-black/65"
          style={{ left: d.x, top: d.y, width: d.w, height: d.h, pointerEvents: allowInteraction ? "auto" : "auto" }}
          onClick={(e) => e.stopPropagation()}
        />
      ))}

      {/* Highlight outline (purely visual, click-through) */}
      {highlight && (
        <div
          className="absolute rounded-[10px] ring-2 ring-primary animate-pulse"
          style={{
            left: highlight.x,
            top: highlight.y,
            width: highlight.w,
            height: highlight.h,
            pointerEvents: "none",
            boxShadow: "0 0 0 9999px transparent",
          }}
        />
      )}

      {/* Popover */}
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
            {!step.hideNext && (
              <Button size="sm" onClick={handleNext} variant="pink" className="gap-1">
                {stepIndex === STEPS.length - 1 ? "Finalizar" : "Siguiente"}
                {stepIndex !== STEPS.length - 1 && <ArrowRight className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        </div>
        {step.hideNext && (
          <p className="text-[11px] text-pink font-medium mt-2 text-right">
            Realiza la acción para continuar →
          </p>
        )}
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
