import { useEffect, useRef, useState } from "react";
import Orb from "@/components/Orb";
import sedefyLogo from "@/assets/sedefy-logo.png";
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  Brain, Activity, AlertTriangle, BarChart3, Map, Sparkles, ArrowRight,
  GraduationCap, Building2, Landmark, School, Users, TrendingUp, Zap,
  Database, LineChart, Target, Shield, Cpu, Network, Eye, MessageSquare,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Utility: animated number counter                                          */
/* -------------------------------------------------------------------------- */
const Counter = ({ to, suffix = "", duration = 2 }: { to: number; suffix?: string; duration?: number }) => {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const start = performance.now();
            const step = (t: number) => {
              const p = Math.min((t - start) / (duration * 1000), 1);
              setValue(Math.floor(to * (1 - Math.pow(1 - p, 3))));
              if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration]);
  return (
    <span ref={ref} className="tabular-nums">
      {value.toLocaleString("es-CO")}
      {suffix}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/*  Hero background: animated nodes network on canvas                         */
/* -------------------------------------------------------------------------- */
const NodesNetwork = ({ density = 90 }: { density?: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const nodes = Array.from({ length: density }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3 * dpr,
      vy: (Math.random() - 0.5) * 0.3 * dpr,
      r: (Math.random() * 1.6 + 0.6) * dpr,
    }));

    const mouse = { x: -9999, y: -9999 };
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) * dpr;
      mouse.y = (e.clientY - rect.top) * dpr;
    };
    window.addEventListener("mousemove", onMove);

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // links
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > canvas.width) a.vx *= -1;
        if (a.y < 0 || a.y > canvas.height) a.vy *= -1;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < 140 * dpr) {
            const alpha = 1 - d / (140 * dpr);
            ctx.strokeStyle = `rgba(34, 211, 183, ${alpha * 0.35})`;
            ctx.lineWidth = 0.6 * dpr;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        const mdx = a.x - mouse.x, mdy = a.y - mouse.y;
        const md = Math.hypot(mdx, mdy);
        if (md < 160 * dpr) {
          ctx.strokeStyle = `rgba(74, 222, 128, ${(1 - md / (160 * dpr)) * 0.6})`;
          ctx.lineWidth = 1 * dpr;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
        // node
        ctx.fillStyle = "rgba(34, 211, 183, 0.85)";
        ctx.shadowColor = "rgba(34, 211, 183, 0.7)";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, [density]);
  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
};

/* -------------------------------------------------------------------------- */
/*  Glass card                                                                */
/* -------------------------------------------------------------------------- */
const GlassCard = ({
  children,
  className = "",
  glow = false,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  };
  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl ${className}`}
      style={{
        boxShadow: glow
          ? "0 0 0 1px rgba(34,211,183,0.08), 0 30px 80px -30px rgba(34,211,183,0.25)"
          : "0 20px 60px -30px rgba(0,0,0,0.6)",
      }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${mx.get()}px ${my.get()}px, rgba(34,211,183,0.15), transparent 40%)`,
        }}
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Magnetic button                                                           */
/* -------------------------------------------------------------------------- */
const MagneticButton = ({
  children,
  variant = "primary",
  onClick,
}: {
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  onClick?: () => void;
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useSpring(0, { stiffness: 200, damping: 15 });
  const y = useSpring(0, { stiffness: 200, damping: 15 });
  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left - rect.width / 2) * 0.3);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.3);
  };
  const reset = () => { x.set(0); y.set(0); };
  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ x, y }}
      className={
        variant === "primary"
          ? "group relative inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium text-[#0B1220] transition-all"
          : "group relative inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-7 py-3.5 text-sm font-medium text-white/90 backdrop-blur-xl transition-all hover:bg-white/[0.08]"
      }
    >
      {variant === "primary" && (
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(135deg, #22D3B7 0%, #4ADE80 100%)",
            boxShadow: "0 10px 40px -10px rgba(34,211,183,0.6)",
          }}
        />
      )}
      <span className="relative flex items-center gap-2">
        {children}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </motion.button>
  );
};

/* -------------------------------------------------------------------------- */
/*  Section title                                                             */
/* -------------------------------------------------------------------------- */
const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[#22D3B7] backdrop-blur">
    <span className="h-1.5 w-1.5 rounded-full bg-[#22D3B7] shadow-[0_0_10px_#22D3B7]" />
    {children}
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Data sources radial diagram                                               */
/* -------------------------------------------------------------------------- */
const DataOrbit = () => {
  const decisions = [
    "Deserción escolar", "Programas de refuerzo", "Planes de estudio", "Rutas de aprendizaje",
    "Refuerzo académico", "Mejora continua", "Convivencia escolar", "Formación docente",
    "Orientación vocacional", "Bienestar estudiantil", "Acompañamiento docente", "Comunicación con familias",
    "Becas", "Inclusión",
  ];
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[640px]">
      {/* rings */}
      {[0.55, 0.75, 0.95].map((s, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border border-white/5"
          style={{ transform: `scale(${s})` }}
          animate={{ rotate: i % 2 ? 360 : -360 }}
          transition={{ duration: 60 + i * 20, repeat: Infinity, ease: "linear" }}
        />
      ))}
      {/* center */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="relative flex h-32 w-32 items-center justify-center rounded-full"
          style={{
            background: "radial-gradient(circle at 30% 30%, #4ADE80, #22D3B7 60%, #0B1220 100%)",
            boxShadow: "0 0 80px rgba(34,211,183,0.5), inset 0 0 40px rgba(255,255,255,0.15)",
          }}
        >
          <Brain className="h-12 w-12 text-white" />
        </motion.div>
        <div className="mt-3 text-center text-xs font-semibold uppercase tracking-widest text-white/70">
          SEDEFY AI
        </div>
      </div>
      {/* decisions */}
      {decisions.map((s, i) => {
        const angle = (i / decisions.length) * Math.PI * 2 - Math.PI / 2;
        const R = 44; // percent
        const left = 50 + Math.cos(angle) * R;
        const top = 50 + Math.sin(angle) * R;
        return (
          <motion.div
            key={s}
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <div className="rounded-full border border-[#22D3B7]/20 bg-white/[0.05] px-3 py-1.5 text-[11px] text-white/80 backdrop-blur-xl shadow-[0_0_20px_rgba(34,211,183,0.08)]">
              {s}
            </div>
          </motion.div>
        );
      })}
      {/* connecting lines */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="line" x1="0" x2="1">
            <stop offset="0%" stopColor="#22D3B7" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#4ADE80" stopOpacity="0.2" />
          </linearGradient>
          <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.8" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {decisions.map((_, i) => {
          const angle = (i / decisions.length) * Math.PI * 2 - Math.PI / 2;
          const R = 44;
          const x = 50 + Math.cos(angle) * R;
          const y = 50 + Math.sin(angle) * R;
          return (
            <motion.line
              key={i}
              x1="50" y1="50" x2={x} y2={y}
              stroke="url(#line)" strokeWidth="0.35" filter="url(#lineGlow)"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: i * 0.05 }}
            />
          );
        })}
      </svg>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Dashboard mock                                                            */
/* -------------------------------------------------------------------------- */
const DashboardMock = () => {
  const bars = [62, 78, 45, 88, 71, 55, 92, 66, 74];
  return (
    <GlassCard className="p-6" glow>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/50">Panel Institucional</div>
          <div className="mt-1 text-lg font-semibold text-white">Inteligencia Educativa · Tiempo real</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#A3E635]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#A3E635] shadow-[0_0_10px_#A3E635]" />
          En vivo
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Estudiantes activos", value: 12000, color: "#22D3B7" },
          { label: "Índice de bienestar", value: 87, suffix: "%", color: "#A3E635" },
          { label: "Alertas activas", value: 342, color: "#4ADE80" },
          { label: "Deserción proyectada", value: 4.2, suffix: "%", color: "#4ADE80" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-white/5 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-widest text-white/40">{k.label}</div>
            <div className="mt-1 text-xl font-semibold text-white">
              <Counter to={k.value} suffix={k.suffix ?? ""} />
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{ background: k.color }}
                initial={{ width: 0 }}
                whileInView={{ width: `${60 + Math.random() * 35}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-white/5 bg-black/20 p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-medium text-white/70">Rendimiento por municipio</div>
            <div className="text-[10px] text-white/40">Últimos 12 meses</div>
          </div>
          <div className="flex h-40 items-end gap-2">
            {bars.map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                whileInView={{ height: `${h}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: i * 0.06 }}
                className="flex-1 rounded-t"
                style={{
                  background: "linear-gradient(to top, rgba(34,211,183,0.15), #22D3B7)",
                  boxShadow: "0 0 20px rgba(34,211,183,0.3)",
                }}
              />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
          <div className="mb-3 text-xs font-medium text-white/70">Mapa de calor territorial</div>
          <div className="grid grid-cols-6 gap-1">
            {Array.from({ length: 36 }).map((_, i) => {
              const v = Math.random();
              const color =
                v > 0.75 ? "#22D3B7" : v > 0.5 ? "#4ADE80" : v > 0.25 ? "#A3E635" : "rgba(255,255,255,0.06)";
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.015 }}
                  className="aspect-square rounded"
                  style={{ background: color, boxShadow: `0 0 10px ${color}55` }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

/* -------------------------------------------------------------------------- */
/*  Chat mock                                                                 */
/* -------------------------------------------------------------------------- */
const AIChat = () => {
  const messages = [
    { role: "user", text: "¿Qué municipios presentan mayor riesgo de deserción este trimestre?" },
    { role: "ai", text: "Identifiqué 7 municipios con riesgo elevado. Los 3 principales: Tumaco (12.4%), Quibdó (10.8%) y Buenaventura (9.6%). Recomiendo priorizar acompañamiento psicosocial en 42 instituciones." },
    { role: "user", text: "¿Qué estudiantes requieren acompañamiento psicosocial inmediato?" },
    { role: "ai", text: "1.284 estudiantes cruzan 3 o más señales de alerta. Generé la lista segmentada por institución y perfil de intervención sugerido." },
  ];
  return (
    <GlassCard className="p-6" glow>
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: "linear-gradient(135deg, #4ADE80, #22D3B7)" }}
        >
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">SEDEFY AI</div>
          <div className="text-xs text-white/50">Asistente de inteligencia educativa</div>
        </div>
      </div>
      <div className="space-y-3">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "bg-white/[0.06] text-white/90"
                  : "text-white"
              }`}
              style={
                m.role === "ai"
                  ? {
                      background: "linear-gradient(135deg, rgba(74,222,128,0.15), rgba(34,211,183,0.08))",
                      border: "1px solid rgba(34,211,183,0.2)",
                    }
                  : { border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              {m.text}
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
};

/* -------------------------------------------------------------------------- */
/*  MAIN PAGE                                                                 */
/* -------------------------------------------------------------------------- */
const Instituciones = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const capabilities = [
    { icon: Target, title: "Perfil Vocacional Inteligente", desc: "Descubre con alta precisión el perfil vocacional de cada estudiante utilizando cientos de variables académicas, conductuales y psicosociales." },
    { icon: Users, title: "Perfil Integral del Estudiante", desc: "Construye automáticamente un perfil único que combina rendimiento, bienestar, contexto familiar y evolución educativa." },
    { icon: AlertTriangle, title: "Detección Temprana de Riesgos", desc: "Identifica estudiantes con riesgo de deserción, bajo rendimiento, convivencia o salud mental antes de que el problema ocurra." },
    { icon: Activity, title: "Indicadores Inteligentes", desc: "Alertas automáticas para docentes, coordinadores y rectores con recomendaciones accionables." },
    { icon: Map, title: "Inteligencia por Grados y Sedes", desc: "Descubre patrones educativos por curso, grado, sede y asignatura en tiempo real." },
    { icon: Brain, title: "IA Educativa", desc: "Asistente inteligente que recomienda acciones concretas para mejorar los resultados educativos." },
  ];

  const audiences = [
    { icon: GraduationCap, title: "Rectores", stats: ["Visión 360 de la institución", "KPIs académicos", "Decisiones basadas en datos"] },
    { icon: Building2, title: "Coordinadores", stats: ["Gestión por grados", "Comparativos por curso", "Reportes automáticos"] },
    { icon: Users, title: "Docentes", stats: ["Seguimiento por estudiante", "Alertas tempranas", "Rutas de refuerzo"] },
    { icon: School, title: "Familias", stats: ["Reportes claros", "Comunicación directa", "Acompañamiento en casa"] },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0B1220] text-white antialiased" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Helmet>
        <title>SEDEFY Instituciones · Inteligencia para colegios y universidades</title>
        <meta name="description" content="La plataforma de inteligencia académica para colegios, universidades e instituciones educativas. Transformamos los datos de tu institución en decisiones inteligentes." />
        <meta property="og:title" content="SEDEFY Instituciones · Inteligencia para colegios y universidades" />
        <meta property="og:description" content="Plataforma de inteligencia académica para transformar la calidad educativa de tu institución." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {/* Ambient background layer */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(1200px 600px at 20% 0%, rgba(34,211,183,0.15), transparent 60%), radial-gradient(1000px 500px at 80% 30%, rgba(74,222,128,0.18), transparent 60%), radial-gradient(800px 400px at 50% 100%, rgba(74,222,128,0.08), transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* NAV */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/5 bg-[#0B1220]/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <img src={sedefyLogo} alt="SEDEFY" width={56} height={56} loading="lazy" className="h-14 w-14 object-contain" />
          </div>
          <div className="hidden gap-8 text-sm text-white/70 md:flex">
            <a href="#plataforma" className="hover:text-white">Plataforma</a>
            <a href="#inteligencia" className="hover:text-white">Inteligencia</a>
            <a href="#dashboard" className="hover:text-white">Dashboard</a>
            <a href="#impacto" className="hover:text-white">Impacto</a>
          </div>
          <a href="#demo">
            <MagneticButton variant="ghost">Solicitar demo</MagneticButton>
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section ref={heroRef} className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 opacity-40"><NodesNetwork /></div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative aspect-square w-[min(1080px,120vmin)]">
            <Orb hue={0} hoverIntensity={0} rotateOnHover forceHoverState={false} />
          </div>
        </div>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 55%, #0B1220 90%)" }} />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <Eyebrow>Inteligencia académica para instituciones educativas</Eyebrow>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="mx-auto max-w-4xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl"
          >
            El Sistema Operativo de{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #22D3B7 0%, #4ADE80 60%, #A3E635 100%)" }}
            >
              Inteligencia
            </span>{" "}
            para la Educación
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 1 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/60 md:text-xl"
          >
            Transformamos millones de datos educativos en decisiones inteligentes para mejorar la calidad educativa de tu institución.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <a href="#demo"><MagneticButton>Solicitar demostración</MagneticButton></a>
            <a href="#plataforma"><MagneticButton variant="ghost">Conocer la plataforma</MagneticButton></a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-16 flex items-center justify-center gap-8 text-xs uppercase tracking-widest text-white/40"
          >
            <div className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#A3E635]" /> Rectores</div>
            <div className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#22D3B7]" /> Coordinadores</div>
            <div className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#4ADE80]" /> Docentes</div>
          </motion.div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-white/40"
        >
          Desplazar
        </motion.div>
      </section>

      {/* PROBLEMA */}
      <section id="plataforma" className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>El problema</Eyebrow>
            <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              La información existe.
              <br />
              <span className="text-white/50">Lo difícil es convertirla en decisiones.</span>
            </h2>
          </div>

          <div className="relative mt-20">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-9">
              {[
                "Calificaciones","Asistencia","Convivencia","Pruebas Saber",
                "Observaciones","Psicosocial","Socioeconómico","Encuestas","Orientación",
              ].map((s, i) => (
                <motion.div
                  key={s}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center text-xs text-white/70 backdrop-blur-xl"
                >
                  <div className="mb-2 flex justify-center">
                    <Database className="h-4 w-4 text-white/40" />
                  </div>
                  {s}
                </motion.div>
              ))}
            </div>

            <svg className="mx-auto mt-8 h-24 w-full max-w-3xl" viewBox="0 0 800 100" preserveAspectRatio="none">
              {Array.from({ length: 9 }).map((_, i) => (
                <motion.path
                  key={i}
                  d={`M ${50 + i * 90} 0 Q 400 50 400 100`}
                  fill="none"
                  stroke="url(#connGrad)"
                  strokeWidth="1"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 0.6 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: i * 0.08 }}
                />
              ))}
              <defs>
                <linearGradient id="connGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22D3B7" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#4ADE80" stopOpacity="1" />
                </linearGradient>
              </defs>
            </svg>

            <div className="flex justify-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                className="relative flex h-24 w-24 items-center justify-center rounded-full"
                style={{
                  background: "radial-gradient(circle at 30% 30%, #4ADE80, #22D3B7 70%)",
                  boxShadow: "0 0 60px rgba(34,211,183,0.6)",
                }}
              >
                <Brain className="h-10 w-10 text-white" />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CEREBRO */}
      <section className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <Eyebrow>El cerebro de SEDEFY</Eyebrow>
              <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Una IA que entiende cada estudiante y cada territorio.
              </h2>
              <p className="mt-6 text-lg text-white/60">
                Calificaciones, asistencia, observaciones académicas y disciplinarias, perfil psicosocial y socioeconómico, competencias, rutas de aprendizaje, pruebas externas, evaluaciones, videos y actividad en plataforma — procesados en tiempo real.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {[
                  { icon: Network, label: "Procesamiento en tiempo real" },
                  { icon: Zap, label: "Latencia inferior al segundo" },
                  { icon: Shield, label: "Cumplimiento normativo" },
                  { icon: Eye, label: "Trazabilidad total" },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70">
                    <f.icon className="h-4 w-4 text-[#22D3B7]" />
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
            <DataOrbit />
          </div>
        </div>
      </section>

      {/* INTELIGENCIA */}
      <section id="inteligencia" className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Inteligencia educativa</Eyebrow>
            <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Seis capacidades que redefinen la gestión educativa.
            </h2>
          </div>
          <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <GlassCard className="h-full p-7">
                  <div
                    className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{
                      background: "linear-gradient(135deg, rgba(34,211,183,0.15), rgba(74,222,128,0.15))",
                      border: "1px solid rgba(34,211,183,0.2)",
                    }}
                  >
                    <c.icon className="h-5 w-5 text-[#22D3B7]" />
                  </div>
                  <div className="mb-2 text-xs font-mono text-white/40">0{i + 1}</div>
                  <h3 className="mb-3 text-xl font-semibold text-white">{c.title}</h3>
                  <p className="text-sm leading-relaxed text-white/60">{c.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD */}
      <section id="dashboard" className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Dashboard institucional</Eyebrow>
            <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              La sala de control académica de tu institución.
            </h2>
            <p className="mt-6 text-lg text-white/60">
              KPIs en vivo, mapas de calor, comparativos entre grados, cursos y asignaturas. Todo con filtros dinámicos.
            </p>
          </div>
          <div className="mt-16">
            <DashboardMock />
          </div>
        </div>
      </section>

      {/* PREDICCIÓN */}
      <section className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Predicción</Eyebrow>
            <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Del dato histórico a la acción recomendada.
            </h2>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-5">
            {[
              { icon: Database, label: "Datos históricos" },
              { icon: Brain, label: "IA" },
              { icon: LineChart, label: "Predicción" },
              { icon: Target, label: "Acción recomendada" },
              { icon: TrendingUp, label: "Mejora educativa" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="relative"
              >
                <GlassCard className="p-6 text-center">
                  <s.icon className="mx-auto mb-3 h-6 w-6 text-[#22D3B7]" />
                  <div className="text-xs font-mono text-white/40">Paso 0{i + 1}</div>
                  <div className="mt-1 text-sm font-semibold text-white">{s.label}</div>
                </GlassCard>
                {i < 4 && (
                  <ArrowRight className="absolute -right-4 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-white/30 md:block" />
                )}
              </motion.div>
            ))}
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { title: "Riesgo de deserción alto", body: "Grado 9°B. Recomiendo activar acompañamiento psicosocial para 8 estudiantes." },
              { title: "Bajo rendimiento matemáticas", body: "3 cursos con caída sostenida. Sugiero ruta de refuerzo dirigida a 62 estudiantes." },
              { title: "Convivencia elevada", body: "12 alertas en la última semana. Priorizar acompañamiento en 3 cursos." },
            ].map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="p-6">
                  <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-[#4ADE80]">
                    <Sparkles className="h-3.5 w-3.5" /> IA recomienda
                  </div>
                  <div className="text-base font-semibold text-white">{r.title}</div>
                  <p className="mt-2 text-sm text-white/60">{r.body}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PARA QUIÉN */}
      <section className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Para quién</Eyebrow>
            <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Diseñado para quienes lideran la educación en cada institución.
            </h2>
          </div>
          <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {audiences.map((a, i) => (
              <motion.div
                key={a.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <GlassCard className="h-full p-6" glow>
                  <a.icon className="mb-4 h-7 w-7 text-[#22D3B7]" />
                  <h3 className="text-lg font-semibold text-white">{a.title}</h3>
                  <ul className="mt-4 space-y-2">
                    {a.stats.map((s) => (
                      <li key={s} className="flex items-center gap-2 text-sm text-white/60">
                        <span className="h-1 w-1 rounded-full bg-[#A3E635]" /> {s}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* IMPACTO */}
      <section id="impacto" className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Impacto</Eyebrow>
            <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Cifras que hablan por la plataforma.
            </h2>
          </div>
          <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { value: 128000000, suffix: "+", label: "Datos procesados" },
              { value: 1200000, suffix: "+", label: "Estudiantes analizados" },
              { value: 340000, suffix: "+", label: "Alertas inteligentes" },
              { value: 480000, suffix: "+", label: "Perfiles vocacionales" },
              { value: 3200, suffix: "+", label: "Instituciones conectadas" },
              { value: 92, suffix: "%", label: "Tiempo ahorrado en reportes" },
            ].map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <GlassCard className="p-8">
                  <div
                    className="text-5xl font-semibold tracking-tight md:text-6xl"
                    style={{
                      background: "linear-gradient(135deg, #22D3B7 0%, #4ADE80 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    <Counter to={m.value} suffix={m.suffix} />
                  </div>
                  <div className="mt-2 text-sm uppercase tracking-widest text-white/50">{m.label}</div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI CHAT */}
      <section className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <Eyebrow>IA conversacional</Eyebrow>
              <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Pregúntele a la educación de su institución.
              </h2>
              <p className="mt-6 text-lg text-white/60">
                SEDEFY AI responde en lenguaje natural con gráficos, listados accionables y recomendaciones fundadas en los datos reales del sistema educativo.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  "¿Qué cursos presentan mayor riesgo de deserción?",
                  "¿Qué estudiantes requieren acompañamiento psicosocial?",
                  "¿Qué docentes necesitan apoyo pedagógico?",
                  "¿Qué grado mejoró más este semestre?",
                ].map((q) => (
                  <div key={q} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
                    <MessageSquare className="h-4 w-4 text-[#4ADE80]" />
                    {q}
                  </div>
                ))}
              </div>
            </div>
            <AIChat />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="demo" className="relative overflow-hidden py-40">
        <div className="absolute inset-0"><NodesNetwork density={60} /></div>
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 20%, #0B1220 80%)" }}
        />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <Eyebrow>Solicite una demostración</Eyebrow>
          <h2 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            Las decisiones educativas más importantes ya no deben basarse en{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #22D3B7 0%, #4ADE80 100%)" }}
            >
              intuición
            </span>.
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-white/60">
            Conozca cómo SEDEFY transforma los datos de su institución en inteligencia para construir una mejor educación.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a href="/contacto"><MagneticButton>Solicitar demostración</MagneticButton></a>
            <a href="mailto:instituciones@sedefy.com"><MagneticButton variant="ghost">Hablar con ventas</MagneticButton></a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="flex items-center gap-2 text-sm text-white/50">
            <img src={sedefyLogo} alt="SEDEFY" width={40} height={40} loading="lazy" className="h-10 w-10 object-contain" />
            SEDEFY · Inteligencia para la educación
          </div>
          <div className="text-xs text-white/40">© {new Date().getFullYear()} SEDEFY. Todos los derechos reservados.</div>
        </div>
      </footer>
    </div>
  );
};

export default Instituciones;
