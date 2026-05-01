import { useEffect, useState } from "react";
import {
  BookOpen,
  Brain,
  HelpCircle,
  Gamepad2,
  FileText,
  Network,
  Sparkles,
} from "lucide-react";

export type CapsuleProgressType =
  | "reading-resumen"
  | "reading-glosario"
  | "reading-notas"
  | "reading-articulo"
  | "mindmap"
  | "quiz"
  | "game";

interface ProgressMeta {
  label: string;
  uppercaseLabel: string;
  Icon: React.ComponentType<{ className?: string }>;
  stages: string[];
}

const META: Record<string, ProgressMeta> = {
  "reading-resumen": {
    label: "Resumen",
    uppercaseLabel: "GENERANDO RESUMEN",
    Icon: FileText,
    stages: [
      "Estoy revisando el material para extraer las ideas clave...",
      "Organizando las secciones principales...",
      "Redactando un resumen claro y conciso...",
      "Dando los toques finales...",
    ],
  },
  "reading-glosario": {
    label: "Glosario",
    uppercaseLabel: "GENERANDO GLOSARIO",
    Icon: BookOpen,
    stages: [
      "Estoy identificando los términos clave del material...",
      "Buscando definiciones precisas...",
      "Ordenando alfabéticamente los conceptos...",
      "Dando los toques finales...",
    ],
  },
  "reading-notas": {
    label: "Notas de estudio",
    uppercaseLabel: "GENERANDO NOTAS",
    Icon: FileText,
    stages: [
      "Estoy revisando el material para tomar apuntes...",
      "Estructurando los puntos principales...",
      "Resaltando conceptos importantes...",
      "Dando los toques finales...",
    ],
  },
  "reading-articulo": {
    label: "Lectura",
    uppercaseLabel: "GENERANDO LECTURA",
    Icon: BookOpen,
    stages: [
      "Estoy revisando el material...",
      "Estructurando la lectura...",
      "Redactando el contenido...",
      "Dando los toques finales...",
    ],
  },
  mindmap: {
    label: "Mapa mental",
    uppercaseLabel: "GENERANDO MAPA MENTAL",
    Icon: Network,
    stages: [
      "Estoy analizando el material para identificar relaciones...",
      "Definiendo el nodo central y las ramas...",
      "Conectando ideas y subtemas...",
      "Dando los toques finales...",
    ],
  },
  quiz: {
    label: "Quiz",
    uppercaseLabel: "GENERANDO QUIZ",
    Icon: HelpCircle,
    stages: [
      "Estoy revisando el material para practicar el recuerdo...",
      "Diseñando preguntas variadas...",
      "Construyendo opciones y retroalimentación...",
      "Dando los toques finales...",
    ],
  },
  game: {
    label: "Juego",
    uppercaseLabel: "GENERANDO JUEGO",
    Icon: Gamepad2,
    stages: [
      "Estoy revisando el material para crear desafíos...",
      "Diseñando la mecánica del juego...",
      "Generando las preguntas y pistas...",
      "Dando los toques finales...",
    ],
  },
};

const FALLBACK: ProgressMeta = {
  label: "Cápsula",
  uppercaseLabel: "GENERANDO CÁPSULA",
  Icon: Sparkles,
  stages: [
    "Estoy revisando el material...",
    "Organizando el contenido...",
    "Dando los toques finales...",
  ],
};

interface Props {
  capsuleType: string;
  /** Approximate expected duration in ms used to advance fake progress bar. */
  expectedDurationMs?: number;
}

export const CapsuleProgressCard = ({
  capsuleType,
  expectedDurationMs = 25000,
}: Props) => {
  const meta = META[capsuleType] || FALLBACK;
  const { Icon, uppercaseLabel, stages } = meta;

  const [stageIdx, setStageIdx] = useState(0);
  const [progress, setProgress] = useState(2);

  // Cycle through stages
  useEffect(() => {
    if (stages.length <= 1) return;
    const interval = setInterval(() => {
      setStageIdx((i) => (i + 1) % stages.length);
    }, Math.max(2500, expectedDurationMs / stages.length));
    return () => clearInterval(interval);
  }, [stages.length, expectedDurationMs]);

  // Animate progress bar (capped at 92% so the final jump happens on completion)
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      // ease-out style: never reach 100% until externally finalized
      const pct = Math.min(92, (elapsed / expectedDurationMs) * 100);
      setProgress(pct);
    }, 250);
    return () => clearInterval(interval);
  }, [expectedDurationMs]);

  return (
    <div className="w-full max-w-md mx-auto py-2 select-none">
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl animate-pulse" />
          <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/90 to-primary flex items-center justify-center shadow-lg">
            <Icon className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <p className="text-[11px] tracking-[0.2em] font-semibold text-muted-foreground mb-2">
          {uppercaseLabel}
        </p>
        <p className="text-base md:text-lg font-semibold leading-snug min-h-[3rem] text-foreground/90">
          {stages[stageIdx]}
        </p>
        <div className="w-full mt-4 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-3">Espera un momento.</p>
      </div>
    </div>
  );
};
