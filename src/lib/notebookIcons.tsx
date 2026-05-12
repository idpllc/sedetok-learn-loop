import {
  Calculator, FlaskConical, Atom, Dna, Globe2, Landmark, BookText, Languages,
  Code2, Music, Palette, Briefcase, HeartPulse, Scale, Cpu, Leaf, Rocket,
  TrendingUp, Brain, BookOpen, Map, Camera, Film, Hammer, Sigma, PenTool,
  type LucideIcon,
} from "lucide-react";

export type NotebookIconStyle = {
  Icon: LucideIcon;
  /** Tailwind classes for the icon tile background */
  bg: string;
  /** Tailwind classes for the icon color */
  fg: string;
  /** Tailwind classes for the card surface tint */
  surface: string;
};

type Rule = {
  keys: RegExp;
  Icon: LucideIcon;
  bg: string;
  fg: string;
  surface: string;
};

// Order matters: more specific rules first
const RULES: Rule[] = [
  { keys: /(algebra|cocient|matemátic|matematic|aritm|geometr|cálculo|calculo|trigonom|ecuaci|fracci|sigma|estad[ií]stic|probabilid)/i,
    Icon: Calculator, bg: "bg-orange-100 dark:bg-orange-950/40", fg: "text-orange-600 dark:text-orange-300", surface: "bg-orange-50/60 dark:bg-orange-950/20" },
  { keys: /(qu[ií]mic|chemistry|reacci[oó]n|molec|compuest|tabla peri)/i,
    Icon: FlaskConical, bg: "bg-emerald-100 dark:bg-emerald-950/40", fg: "text-emerald-600 dark:text-emerald-300", surface: "bg-emerald-50/60 dark:bg-emerald-950/20" },
  { keys: /(f[ií]sic|physics|newton|cinem|din[áa]mic|termodin|óptic|optic|electromag)/i,
    Icon: Atom, bg: "bg-indigo-100 dark:bg-indigo-950/40", fg: "text-indigo-600 dark:text-indigo-300", surface: "bg-indigo-50/60 dark:bg-indigo-950/20" },
  { keys: /(biolog[ií]a|biology|c[eé]lula|gen[eé]tica|adn|dna|ecosistem|botán|zoolog)/i,
    Icon: Dna, bg: "bg-green-100 dark:bg-green-950/40", fg: "text-green-600 dark:text-green-300", surface: "bg-green-50/60 dark:bg-green-950/20" },
  { keys: /(medicin|salud|anatom|fisiolog|enfermer|cl[ií]nic)/i,
    Icon: HeartPulse, bg: "bg-rose-100 dark:bg-rose-950/40", fg: "text-rose-600 dark:text-rose-300", surface: "bg-rose-50/60 dark:bg-rose-950/20" },
  { keys: /(historia|history|hist[oó]ric|civiliz|guerra|imperio|colonia)/i,
    Icon: Landmark, bg: "bg-amber-100 dark:bg-amber-950/40", fg: "text-amber-700 dark:text-amber-300", surface: "bg-amber-50/60 dark:bg-amber-950/20" },
  { keys: /(geograf|geography|mapa|continent|pa[ií]s|territ)/i,
    Icon: Map, bg: "bg-teal-100 dark:bg-teal-950/40", fg: "text-teal-600 dark:text-teal-300", surface: "bg-teal-50/60 dark:bg-teal-950/20" },
  { keys: /(astronom|espacio|space|planeta|galax|cosmo|nasa|cohete)/i,
    Icon: Rocket, bg: "bg-violet-100 dark:bg-violet-950/40", fg: "text-violet-600 dark:text-violet-300", surface: "bg-violet-50/60 dark:bg-violet-950/20" },
  { keys: /(programaci|c[oó]digo|code|software|javascript|python|react|developer|desarrollo web|algoritm)/i,
    Icon: Code2, bg: "bg-slate-100 dark:bg-slate-800/60", fg: "text-slate-700 dark:text-slate-200", surface: "bg-slate-50/70 dark:bg-slate-900/30" },
  { keys: /(tecnolog|inform[aá]tica|hardware|computa|inteligencia artificial|\bai\b|ia\b)/i,
    Icon: Cpu, bg: "bg-cyan-100 dark:bg-cyan-950/40", fg: "text-cyan-600 dark:text-cyan-300", surface: "bg-cyan-50/60 dark:bg-cyan-950/20" },
  { keys: /(ingl[eé]s|english|franc[eé]s|french|alem[aá]n|german|idioma|language|gram[aá]tica|vocabul)/i,
    Icon: Languages, bg: "bg-sky-100 dark:bg-sky-950/40", fg: "text-sky-600 dark:text-sky-300", surface: "bg-sky-50/60 dark:bg-sky-950/20" },
  { keys: /(literatur|novela|poes[ií]a|poema|cuento|narrativ|lectura)/i,
    Icon: BookText, bg: "bg-purple-100 dark:bg-purple-950/40", fg: "text-purple-600 dark:text-purple-300", surface: "bg-purple-50/60 dark:bg-purple-950/20" },
  { keys: /(arte|pintura|dibujo|escultura|art\b|design|diseño)/i,
    Icon: Palette, bg: "bg-pink-100 dark:bg-pink-950/40", fg: "text-pink-600 dark:text-pink-300", surface: "bg-pink-50/60 dark:bg-pink-950/20" },
  { keys: /(música|music|cancion|instrument|melod[ií]a|ritmo)/i,
    Icon: Music, bg: "bg-fuchsia-100 dark:bg-fuchsia-950/40", fg: "text-fuchsia-600 dark:text-fuchsia-300", surface: "bg-fuchsia-50/60 dark:bg-fuchsia-950/20" },
  { keys: /(cine|film|pel[ií]cula|video|movie)/i,
    Icon: Film, bg: "bg-zinc-100 dark:bg-zinc-800/60", fg: "text-zinc-700 dark:text-zinc-200", surface: "bg-zinc-50/70 dark:bg-zinc-900/30" },
  { keys: /(foto|photograph|c[aá]mara)/i,
    Icon: Camera, bg: "bg-stone-100 dark:bg-stone-800/60", fg: "text-stone-700 dark:text-stone-200", surface: "bg-stone-50/70 dark:bg-stone-900/30" },
  { keys: /(derecho|legal|ley|jur[ií]dic|justici|constituci)/i,
    Icon: Scale, bg: "bg-yellow-100 dark:bg-yellow-950/40", fg: "text-yellow-700 dark:text-yellow-300", surface: "bg-yellow-50/60 dark:bg-yellow-950/20" },
  { keys: /(econom|finan|contab|invers|mercado|negoci|business|startup|empresa|valuation|marketing|venta)/i,
    Icon: TrendingUp, bg: "bg-blue-100 dark:bg-blue-950/40", fg: "text-blue-600 dark:text-blue-300", surface: "bg-blue-50/60 dark:bg-blue-950/20" },
  { keys: /(filosof|ética|etica|psicolog|sociolog|pensamiento)/i,
    Icon: Brain, bg: "bg-red-100 dark:bg-red-950/40", fg: "text-red-600 dark:text-red-300", surface: "bg-red-50/60 dark:bg-red-950/20" },
  { keys: /(ecolog|ambient|sosten|natural|planta|jard[ií]n)/i,
    Icon: Leaf, bg: "bg-lime-100 dark:bg-lime-950/40", fg: "text-lime-700 dark:text-lime-300", surface: "bg-lime-50/60 dark:bg-lime-950/20" },
  { keys: /(ingenier|construcci|arquitect|mec[aá]nic|industria)/i,
    Icon: Hammer, bg: "bg-orange-100 dark:bg-orange-950/40", fg: "text-orange-700 dark:text-orange-300", surface: "bg-orange-50/60 dark:bg-orange-950/20" },
  { keys: /(escritura|redacci|ensayo|writing)/i,
    Icon: PenTool, bg: "bg-indigo-100 dark:bg-indigo-950/40", fg: "text-indigo-600 dark:text-indigo-300", surface: "bg-indigo-50/60 dark:bg-indigo-950/20" },
  { keys: /(global|mundo|internacional)/i,
    Icon: Globe2, bg: "bg-teal-100 dark:bg-teal-950/40", fg: "text-teal-600 dark:text-teal-300", surface: "bg-teal-50/60 dark:bg-teal-950/20" },
  { keys: /(trabajo|profesion|carrera|career)/i,
    Icon: Briefcase, bg: "bg-amber-100 dark:bg-amber-950/40", fg: "text-amber-700 dark:text-amber-300", surface: "bg-amber-50/60 dark:bg-amber-950/20" },
  { keys: /(estad[ií]stic|datos|data|gr[aá]fic)/i,
    Icon: Sigma, bg: "bg-emerald-100 dark:bg-emerald-950/40", fg: "text-emerald-600 dark:text-emerald-300", surface: "bg-emerald-50/60 dark:bg-emerald-950/20" },
];

const DEFAULT_STYLE: NotebookIconStyle = {
  Icon: BookOpen,
  bg: "bg-violet-100 dark:bg-violet-950/40",
  fg: "text-violet-600 dark:text-violet-300",
  surface: "bg-violet-50/60 dark:bg-violet-950/20",
};

/**
 * Picks a Lucide icon + color palette based on a notebook's title,
 * description and source titles — similar to NotebookLM's dynamic covers.
 */
export function getNotebookIconStyle(input: {
  title?: string | null;
  description?: string | null;
  sourceTitles?: (string | null | undefined)[];
}): NotebookIconStyle {
  const haystack = [
    input.title || "",
    input.description || "",
    ...(input.sourceTitles || []).filter(Boolean),
  ].join(" \n ");
  if (!haystack.trim()) return DEFAULT_STYLE;
  for (const r of RULES) {
    if (r.keys.test(haystack)) {
      return { Icon: r.Icon, bg: r.bg, fg: r.fg, surface: r.surface };
    }
  }
  return DEFAULT_STYLE;
}
