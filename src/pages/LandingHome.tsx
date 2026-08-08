import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import sedefyLogo from "@/assets/sedefy-logo.png";
import {
  Brain, HeartPulse, Compass, GraduationCap, Sparkles, ArrowRight, Languages,
  ShieldCheck, LineChart, Users, BookOpen, Lightbulb, AlertTriangle, Target, MessageSquare,
  Leaf, Handshake, LayoutGrid,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Bilingual copy (ES / EN) — auto-detected from browser via i18next          */
/* -------------------------------------------------------------------------- */

type Lang = "es" | "en";

const COPY = {
  es: {
    htmlLang: "es",
    meta: {
      title: "SEDEFY — Inteligencia educativa para cada estudiante",
      description:
        "SEDEFY convierte la actividad académica en inteligencia: detecta riesgos psicosociales, revela potencial académico, construye el perfil vocacional y sugiere mejoras a la forma de enseñar.",
    },
    nav: { pillars: "Qué detecta", how: "Cómo funciona", impact: "Impacto", login: "Iniciar sesión", demo: "Solicitar demo" },
    hero: {
      eyebrow: "Inteligencia educativa",
      title1: "La educación deja datos.",
      title2: "SEDEFY los convierte en",
      gradient: "decisiones",
      sub: "Una plataforma de inteligencia educativa que aprende de cada lectura, quiz, ruta y conversación para entender a cada estudiante: cómo está, qué puede lograr, hacia dónde va y cómo enseñarle mejor.",
      cta1: "Solicitar demostración",
      cta2: "Explorar la plataforma",
      badges: ["Sin instalar nada", "Datos protegidos", "Español · English"],
    },
    pillarsTitle: "Siete señales que ninguna institución debería seguir ignorando",
    pillarsSub: "SEDEFY analiza patrones de uso, desempeño, convivencia y contexto para hacer visible lo que hoy pasa desapercibido.",
    pillars: [
      {
        icon: "risk",
        tag: "Bienestar",
        title: "Riesgos psicosociales",
        text: "Señales tempranas de desmotivación, aislamiento, caída abrupta de desempeño o abandono. Alertas priorizadas para que orientación y familia actúen a tiempo.",
        bullets: ["Alertas tempranas de deserción", "Cambios de comportamiento y participación", "Seguimiento por estudiante y por curso"],
      },
      {
        icon: "potential",
        tag: "Desempeño",
        title: "Potencial académico",
        text: "Más allá de la nota: identifica fortalezas por área, ritmo de aprendizaje e inteligencias predominantes para llevar a cada estudiante a su techo real.",
        bullets: ["Mapa de fortalezas por área", "Brechas y refuerzos sugeridos", "Progreso comparado consigo mismo"],
      },
      {
        icon: "vocation",
        tag: "Futuro",
        title: "Perfil vocacional",
        text: "Intereses, habilidades y evidencias reales de aprendizaje se combinan en un perfil vocacional vivo que orienta la elección de carrera y de proyecto de vida.",
        bullets: ["Perfil 360 del estudiante", "Rutas y carreras afines", "Hoja de vida académica exportable"],
      },
      {
        icon: "teaching",
        tag: "Docencia",
        title: "Mejoras a la enseñanza",
        text: "Qué contenidos funcionan, dónde se pierde el grupo y qué estrategia rinde más. Recomendaciones concretas para ajustar la práctica pedagógica.",
        bullets: ["Efectividad por recurso y tema", "Puntos de fuga del aprendizaje", "Sugerencias didácticas con IA"],
      },
      {
        icon: "environment",
        tag: "Entorno",
        title: "Riesgos ambientales y de contexto",
        text: "Factores del entorno que condicionan el aprendizaje: sede, zona, conectividad, transporte, alimentación, temporada climática y condiciones del aula.",
        bullets: ["Mapa de riesgo por sede y zona", "Brechas de conectividad y recursos", "Efecto del contexto en asistencia y desempeño"],
      },
      {
        icon: "coexistence",
        tag: "Convivencia",
        title: "Clima escolar y convivencia",
        text: "Señales de conflicto, exclusión o acoso a partir de participación, interacción y reportes. Permite intervenir con datos, no con percepciones.",
        bullets: ["Termómetro de clima por curso", "Detección de aislamiento y exclusión", "Seguimiento a casos e intervenciones"],
      },
      {
        icon: "curriculum",
        tag: "Currículo",
        title: "Diseño y mejora curricular",
        text: "Cobertura real de competencias, coherencia entre lo planeado y lo aprendido, y evidencia para ajustar mallas, planes de área y proyectos transversales.",
        bullets: ["Cobertura de competencias por periodo", "Brechas entre plan y aprendizaje real", "Sugerencias de ajuste curricular con IA"],
      },
    ],
    howTitle: "De la actividad diaria a la decisión pedagógica",
    howSteps: [
      { t: "Captura", d: "Lecturas, videos, quizzes, juegos, rutas, cuadernos y calificaciones institucionales alimentan el sistema sin trabajo adicional." },
      { t: "Análisis", d: "Los modelos de SEDEFY cruzan desempeño, constancia, interacción y contexto para construir el perfil de cada estudiante." },
      { t: "Señal", d: "Alertas y hallazgos priorizados llegan a docentes, orientación y directivos con el nivel de detalle que cada rol necesita." },
      { t: "Acción", d: "Rutas de refuerzo, acompañamiento y ajustes pedagógicos sugeridos, con seguimiento del efecto real de cada intervención." },
    ],
    impactTitle: "Inteligencia que se traduce en resultados",
    impact: [
      { k: "Alertas tempranas", v: "Semanas antes de que la nota lo muestre" },
      { k: "Perfil por estudiante", v: "Académico, vocacional y de bienestar" },
      { k: "Menos trabajo docente", v: "Reportes automáticos, no formatos" },
      { k: "Una sola fuente", v: "Toda la institución mirando lo mismo" },
    ],
    audienceTitle: "Pensado para todo el ecosistema educativo",
    audiences: [
      { t: "Rectores y directivos", d: "Tablero institucional con riesgo, desempeño y participación en tiempo real.", href: "/instituciones", cta: "Ver para colegios" },
      { t: "Secretarías y ministerios", d: "Inteligencia territorial para políticas y asignación de recursos.", href: "/gobierno", cta: "Ver para gobierno" },
      { t: "Docentes y orientación", d: "Señales accionables por curso y por estudiante, sin diligenciar formatos.", href: "/auth", cta: "Empezar gratis" },
    ],
    questionsTitle: "Preguntas que SEDEFY ya puede responder",
    questions: [
      "¿Qué estudiantes muestran señales de riesgo psicosocial este mes?",
      "¿Dónde está el mayor potencial académico sin aprovechar?",
      "¿Qué perfil vocacional tiene este grado y qué rutas le convienen?",
      "¿Qué estrategia de enseñanza está funcionando mejor y por qué?",
    ],
    ctaTitle1: "Deje de decidir la educación con",
    ctaGradient: "intuición",
    ctaSub: "Conozca cómo SEDEFY convierte la actividad de su institución en inteligencia educativa accionable.",
    cta1: "Solicitar demostración",
    cta2: "Crear cuenta gratis",
    footer: "SEDEFY · Inteligencia para la educación",
    rights: "Todos los derechos reservados.",
  },
  en: {
    htmlLang: "en",
    meta: {
      title: "SEDEFY — Educational intelligence for every student",
      description:
        "SEDEFY turns everyday academic activity into intelligence: it detects psychosocial risk, reveals academic potential, builds vocational profiles and suggests better ways to teach.",
    },
    nav: { pillars: "What it detects", how: "How it works", impact: "Impact", login: "Sign in", demo: "Request a demo" },
    hero: {
      eyebrow: "Educational intelligence",
      title1: "Learning leaves data behind.",
      title2: "SEDEFY turns it into",
      gradient: "decisions",
      sub: "An educational intelligence platform that learns from every reading, quiz, path and conversation to understand each student: how they are, what they can achieve, where they are heading and how to teach them better.",
      cta1: "Request a demo",
      cta2: "Explore the platform",
      badges: ["Nothing to install", "Protected data", "Español · English"],
    },
    pillarsTitle: "Seven signals no school should keep ignoring",
    pillarsSub: "SEDEFY analyses usage, performance, school climate and context to make visible what goes unnoticed today.",
    pillars: [
      {
        icon: "risk",
        tag: "Wellbeing",
        title: "Psychosocial risk",
        text: "Early signals of disengagement, isolation, sudden performance drops or dropout. Prioritised alerts so counselling and families can act in time.",
        bullets: ["Early dropout alerts", "Behaviour and participation shifts", "Tracking per student and per class"],
      },
      {
        icon: "potential",
        tag: "Performance",
        title: "Academic potential",
        text: "Beyond the grade: strengths by subject area, learning pace and dominant intelligences, so every student reaches their real ceiling.",
        bullets: ["Strength map by area", "Gaps and suggested reinforcement", "Progress measured against themselves"],
      },
      {
        icon: "vocation",
        tag: "Future",
        title: "Vocational profile",
        text: "Interests, skills and real learning evidence combine into a living vocational profile that guides career and life-project choices.",
        bullets: ["360° student profile", "Matching paths and careers", "Exportable academic CV"],
      },
      {
        icon: "teaching",
        tag: "Teaching",
        title: "Better ways to teach",
        text: "Which content works, where the class loses the thread and which strategy pays off. Concrete recommendations to adjust teaching practice.",
        bullets: ["Effectiveness by resource and topic", "Learning drop-off points", "AI-assisted teaching suggestions"],
      },
      {
        icon: "environment",
        tag: "Environment",
        title: "Environmental & context risks",
        text: "Context factors that shape learning: campus, area, connectivity, transport, nutrition, weather season and classroom conditions.",
        bullets: ["Risk map by campus and area", "Connectivity and resource gaps", "Context impact on attendance and results"],
      },
      {
        icon: "coexistence",
        tag: "Climate",
        title: "School climate & coexistence",
        text: "Signals of conflict, exclusion or bullying from participation, interaction and reports — so you intervene with data, not perceptions.",
        bullets: ["Climate thermometer per class", "Isolation and exclusion detection", "Case and intervention follow-up"],
      },
      {
        icon: "curriculum",
        tag: "Curriculum",
        title: "Curriculum design & improvement",
        text: "Real competency coverage, coherence between what is planned and what is learned, and evidence to adjust syllabi and cross-cutting projects.",
        bullets: ["Competency coverage per term", "Gaps between plan and real learning", "AI-assisted curriculum adjustments"],
      },
    ],
    howTitle: "From daily activity to pedagogical decisions",
    howSteps: [
      { t: "Capture", d: "Readings, videos, quizzes, games, paths, notebooks and institutional grades feed the system with no extra work." },
      { t: "Analysis", d: "SEDEFY models cross performance, consistency, interaction and context to build each student's profile." },
      { t: "Signal", d: "Prioritised alerts and findings reach teachers, counsellors and leaders with the detail each role needs." },
      { t: "Action", d: "Suggested reinforcement paths, support and teaching adjustments — with follow-up on the real effect of each intervention." },
    ],
    impactTitle: "Intelligence that turns into results",
    impact: [
      { k: "Early alerts", v: "Weeks before grades show it" },
      { k: "Profile per student", v: "Academic, vocational and wellbeing" },
      { k: "Less teacher paperwork", v: "Automatic reports, not forms" },
      { k: "One single source", v: "The whole school looking at the same data" },
    ],
    audienceTitle: "Built for the whole education ecosystem",
    audiences: [
      { t: "Principals and leaders", d: "Institutional dashboard with risk, performance and engagement in real time.", href: "/instituciones", cta: "For schools" },
      { t: "Ministries and districts", d: "Territorial intelligence for policy and resource allocation.", href: "/gobierno", cta: "For government" },
      { t: "Teachers and counsellors", d: "Actionable signals per class and per student, with no forms to fill in.", href: "/auth", cta: "Start free" },
    ],
    questionsTitle: "Questions SEDEFY can already answer",
    questions: [
      "Which students show psychosocial risk signals this month?",
      "Where is the greatest untapped academic potential?",
      "What vocational profile does this grade have and which paths fit it?",
      "Which teaching strategy is working best, and why?",
    ],
    ctaTitle1: "Stop running education on",
    ctaGradient: "intuition",
    ctaSub: "See how SEDEFY turns your institution's activity into actionable educational intelligence.",
    cta1: "Request a demo",
    cta2: "Create a free account",
    footer: "SEDEFY · Intelligence for education",
    rights: "All rights reserved.",
  },
} as const;

/* -------------------------------------------------------------------------- */
/*  Animated nodes network background — soft, light palette                    */
/* -------------------------------------------------------------------------- */
const NodesNetwork = ({ density = 70 }: { density?: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);
    const nodes = Array.from({ length: density }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.28 * dpr,
      vy: (Math.random() - 0.5) * 0.28 * dpr,
      r: (Math.random() * 1.5 + 0.5) * dpr,
    }));
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > canvas.width) a.vx *= -1;
        if (a.y < 0 || a.y > canvas.height) a.vy *= -1;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 130 * dpr) {
            ctx.strokeStyle = `rgba(34, 211, 183, ${(1 - d / (130 * dpr)) * 0.22})`;
            ctx.lineWidth = 0.6 * dpr;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        ctx.fillStyle = "rgba(34, 211, 183, 0.55)";
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [density]);
  return <canvas ref={canvasRef} className="h-full w-full opacity-70" />;
};

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#22D3B7]/20 bg-[#22D3B7]/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[#0F766E] backdrop-blur">
    <span className="h-1.5 w-1.5 rounded-full bg-[#22D3B7] shadow-[0_0_10px_#22D3B7]" />
    {children}
  </div>
);

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    whileHover={{ y: -6 }}
    transition={{ type: "spring", stiffness: 200, damping: 20 }}
    className={`group relative overflow-hidden rounded-2xl border border-black/5 bg-white/80 shadow-[0_10px_40px_-20px_rgba(15,23,42,0.12)] backdrop-blur-xl ${className}`}
  >
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      style={{ background: "radial-gradient(500px circle at 50% 0%, rgba(34,211,183,0.10), transparent 60%)" }}
    />
    <div className="relative">{children}</div>
  </motion.div>
);

const PILLAR_ICONS: Record<string, typeof Brain> = {
  risk: HeartPulse,
  potential: LineChart,
  vocation: Compass,
  teaching: Lightbulb,
  environment: Leaf,
  coexistence: Handshake,
  curriculum: LayoutGrid,
};


const PrimaryLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link
    to={to}
    className="group relative inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium text-[#0B1220]"
  >
    <span
      className="absolute inset-0 rounded-full"
      style={{
        background: "linear-gradient(135deg, #22D3B7 0%, #4ADE80 100%)",
        boxShadow: "0 10px 40px -10px rgba(34,211,183,0.5)",
      }}
    />
    <span className="relative flex items-center gap-2">
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </span>
  </Link>
);

const GhostLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link
    to={to}
    className="group inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-7 py-3.5 text-sm font-medium text-[#0F172A]/90 backdrop-blur-xl transition-colors hover:bg-white hover:border-black/15"
  >
    {children}
    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
  </Link>
);

/* -------------------------------------------------------------------------- */
/*  Landing                                                                    */
/* -------------------------------------------------------------------------- */
const LandingHome = () => {
  const { i18n } = useTranslation();
  const lang: Lang = useMemo(
    () => (i18n.language?.toLowerCase().startsWith("en") ? "en" : "es"),
    [i18n.language]
  );
  const c = COPY[lang];
  const [q, setQ] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setQ((v) => (v + 1) % c.questions.length), 3800);
    return () => clearInterval(id);
  }, [c.questions.length]);

  const toggleLang = () => i18n.changeLanguage(lang === "es" ? "en" : "es");

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC] text-[#0F172A] antialiased">
      <Helmet>
        <html lang={c.htmlLang} />
        <title>{c.meta.title}</title>
        <meta name="description" content={c.meta.description} />
        <link rel="canonical" href="https://sedefy.com/" />
        <link rel="alternate" hrefLang="es" href="https://sedefy.com/" />
        <link rel="alternate" hrefLang="en" href="https://sedefy.com/" />
        <link rel="alternate" hrefLang="x-default" href="https://sedefy.com/" />
        <meta property="og:title" content={c.meta.title} />
        <meta property="og:description" content={c.meta.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://sedefy.com/" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "SEDEFY",
            applicationCategory: "EducationalApplication",
            description: c.meta.description,
            url: "https://sedefy.com/",
            offers: { "@type": "Offer", price: "0", priceCurrency: "COP" },
          })}
        </script>
      </Helmet>

      {/* NAV */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-white shadow-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center">
            <img src={sedefyLogo} alt="SEDEFY" width={200} height={56} loading="eager" className="h-12 w-auto object-contain md:h-14" />
          </Link>
          <div className="hidden items-center gap-8 text-sm text-[#0F172A]/60 md:flex">
            <a href="#pillars" className="transition-colors hover:text-[#0F172A]">{c.nav.pillars}</a>
            <a href="#how" className="transition-colors hover:text-[#0F172A]">{c.nav.how}</a>
            <a href="#impact" className="transition-colors hover:text-[#0F172A]">{c.nav.impact}</a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleLang}
              aria-label="Language / Idioma"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-black/[0.03] px-3 py-1.5 text-xs text-[#0F172A]/80 transition-colors hover:bg-black/[0.07]"
            >
              <Languages className="h-3.5 w-3.5" />
              {lang === "es" ? "EN" : "ES"}
            </button>
            <Link to="/auth" className="hidden text-sm text-[#0F172A]/70 transition-colors hover:text-[#0F172A] sm:inline">
              {c.nav.login}
            </Link>
            <Link
              to="/contacto"
              className="rounded-full px-4 py-2 text-xs font-medium text-[#0B1220]"
              style={{ background: "linear-gradient(135deg, #22D3B7 0%, #4ADE80 100%)" }}
            >
              {c.nav.demo}
            </Link>
          </div>
        </nav>
      </header>


      {/* HERO */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden bg-white pt-28">
        <div className="absolute inset-0"><NodesNetwork density={80} /></div>
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(34,211,183,0.10), transparent 60%)" }}
        />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <Eyebrow>{c.hero.eyebrow}</Eyebrow>
            <h1 className="text-balance text-5xl font-semibold leading-[1.03] tracking-tight text-[#0F172A] md:text-7xl">
              {c.hero.title1}
              <br />
              {c.hero.title2}{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #22D3B7 0%, #16A34A 100%)" }}
              >
                {c.hero.gradient}
              </span>
              .
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-[#0F172A]/60">{c.hero.sub}</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <PrimaryLink to="/contacto">{c.hero.cta1}</PrimaryLink>
              <GhostLink to="/auth">{c.hero.cta2}</GhostLink>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-xs text-[#0F172A]/50">
              {c.hero.badges.map((b) => (
                <span key={b} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1 shadow-sm">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#16A34A]" />
                  {b}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Rotating question card */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15 }}>
            <GlassCard className="p-7">
              <div className="mb-5 flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full"
                  style={{ background: "radial-gradient(circle at 30% 30%, #4ADE80, #22D3B7 70%)" }}
                >
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#0F172A]">SEDEFY AI</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#16A34A]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#16A34A]" />
                    {lang === "es" ? "Analizando en tiempo real" : "Analysing in real time"}
                  </div>
                </div>
              </div>
              <motion.p key={q} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="min-h-[3.5rem] text-lg text-[#0F172A]/85">
                “{c.questions[q]}”
              </motion.p>
              <div className="mt-6 space-y-3">
                {[
                  { icon: AlertTriangle, label: lang === "es" ? "Riesgo psicosocial" : "Psychosocial risk", v: 24, color: "#F87171" },
                  { icon: LineChart, label: lang === "es" ? "Potencial académico" : "Academic potential", v: 78, color: "#22D3B7" },
                  { icon: Compass, label: lang === "es" ? "Perfil vocacional" : "Vocational profile", v: 91, color: "#4ADE80" },
                  { icon: Lightbulb, label: lang === "es" ? "Mejora didáctica" : "Teaching improvement", v: 63, color: "#16A34A" },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="mb-1 flex items-center justify-between text-[11px] text-[#0F172A]/55">
                      <span className="inline-flex items-center gap-1.5">
                        <row.icon className="h-3.5 w-3.5" style={{ color: row.color }} />
                        {row.label}
                      </span>
                      <span className="tabular-nums">{row.v}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: row.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${row.v}%` }}
                        transition={{ duration: 1.3, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* PILLARS */}
      <section id="pillars" className="relative bg-[#F8FAFC] py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <Eyebrow>{lang === "es" ? "Qué detecta" : "What it detects"}</Eyebrow>
            <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-[#0F172A] md:text-5xl">{c.pillarsTitle}</h2>
            <p className="mt-6 text-lg text-[#0F172A]/60">{c.pillarsSub}</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {c.pillars.map((p, i) => {
              const Icon = PILLAR_ICONS[p.icon] ?? Sparkles;
              return (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <GlassCard className="h-full p-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#22D3B7]/25 bg-[#22D3B7]/10">
                        <Icon className="h-5 w-5 text-[#0F766E]" />
                      </div>
                      <span className="rounded-full border border-black/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[#0F172A]/50">
                        {p.tag}
                      </span>
                    </div>
                    <h3 className="mt-6 text-2xl font-semibold text-[#0F172A]">{p.title}</h3>
                    <p className="mt-3 text-[#0F172A]/60">{p.text}</p>
                    <ul className="mt-6 space-y-2">
                      {p.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm text-[#0F172A]/70">
                          <Target className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="relative overflow-hidden bg-white py-32">
        <div className="absolute inset-0 opacity-50"><NodesNetwork density={40} /></div>
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <Eyebrow>{lang === "es" ? "Cómo funciona" : "How it works"}</Eyebrow>
            <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-[#0F172A] md:text-5xl">{c.howTitle}</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {c.howSteps.map((s, i) => (
              <motion.div
                key={s.t}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <GlassCard className="h-full p-7">
                  <div className="text-4xl font-semibold text-[#0F172A]/10">0{i + 1}</div>
                  <h3 className="mt-3 text-xl font-semibold text-[#0F172A]">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#0F172A]/60">{s.d}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* IMPACT */}
      <section id="impact" className="relative bg-[#F8FAFC] py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <Eyebrow>{lang === "es" ? "Impacto" : "Impact"}</Eyebrow>
            <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-[#0F172A] md:text-5xl">{c.impactTitle}</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {c.impact.map((k, i) => (
              <motion.div
                key={k.k}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
              >
                <GlassCard className="h-full p-6">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#0F766E]">{k.k}</div>
                  <div className="mt-3 text-lg text-[#0F172A]/85">{k.v}</div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {/* Questions list */}
          <div className="mt-20 grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Eyebrow>{lang === "es" ? "IA conversacional" : "Conversational AI"}</Eyebrow>
              <h3 className="text-balance text-3xl font-semibold leading-tight text-[#0F172A] md:text-4xl">{c.questionsTitle}</h3>
              <div className="mt-8 space-y-3">
                {c.questions.map((qq) => (
                  <div key={qq} className="flex items-center gap-3 rounded-lg border border-black/5 bg-white px-4 py-3 text-sm text-[#0F172A]/70 shadow-sm">
                    <MessageSquare className="h-4 w-4 shrink-0 text-[#16A34A]" />
                    {qq}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
              {c.audiences.map((a) => (
                <GlassCard key={a.t} className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white">
                      {a.href === "/gobierno" ? (
                        <Users className="h-4.5 w-4.5 text-[#0F766E]" />
                      ) : a.href === "/instituciones" ? (
                        <GraduationCap className="h-4.5 w-4.5 text-[#0F766E]" />
                      ) : (
                        <BookOpen className="h-4.5 w-4.5 text-[#0F766E]" />
                      )}
                    </div>
                    <div className="text-base font-semibold text-[#0F172A]">{a.t}</div>
                  </div>
                  <p className="mt-3 text-sm text-[#0F172A]/60">{a.d}</p>
                  <Link to={a.href} className="mt-4 inline-flex items-center gap-1.5 text-sm text-[#16A34A] hover:underline">
                    {a.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-white py-36">
        <div className="absolute inset-0"><NodesNetwork density={55} /></div>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 20%, rgba(255,255,255,0.9) 80%)" }} />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <Eyebrow>{c.nav.demo}</Eyebrow>
          <h2 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-[#0F172A] md:text-6xl">
            {c.ctaTitle1}{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #22D3B7 0%, #16A34A 100%)" }}
            >
              {c.ctaGradient}
            </span>
            .
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-[#0F172A]/60">{c.ctaSub}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <PrimaryLink to="/contacto">{c.cta1}</PrimaryLink>
            <GhostLink to="/auth">{c.cta2}</GhostLink>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/5 bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="flex items-center gap-2 text-sm text-[#0F172A]/50">
            <img src={sedefyLogo} alt="SEDEFY" width={40} height={40} loading="lazy" className="h-10 w-10 object-contain" />
            {c.footer}
          </div>
          <div className="flex items-center gap-5 text-xs text-[#0F172A]/40">
            <Link to="/instituciones" className="hover:text-[#0F172A]/70">{lang === "es" ? "Colegios" : "Schools"}</Link>
            <Link to="/gobierno" className="hover:text-[#0F172A]/70">{lang === "es" ? "Gobierno" : "Government"}</Link>
            <Link to="/privacy" className="hover:text-[#0F172A]/70">{lang === "es" ? "Privacidad" : "Privacy"}</Link>
            <span>© {new Date().getFullYear()} SEDEFY. {c.rights}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingHome;
