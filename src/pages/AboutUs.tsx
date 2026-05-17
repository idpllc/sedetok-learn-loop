import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  GraduationCap,
  Globe2,
  HeartHandshake,
  Sparkles,
  Rocket,
  Users,
  BookOpen,
  Trophy,
  Brain,
  ShieldCheck,
  Languages,
  Zap,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const AboutUs = () => {
  useEffect(() => {
    document.title = "About Sedefy — Democratizing Education in Latin America";
    const desc =
      "Sedefy is an ecosystem fighting poverty through knowledge. We build high-impact software to close the educational gap and reduce school dropout in Latin America.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}/about-us`);
  }, []);

  const pillars = [
    {
      icon: Globe2,
      title: "Democratizing Education",
      description:
        "We believe every learner deserves world-class education, regardless of income, geography, or background.",
    },
    {
      icon: HeartHandshake,
      title: "Knowledge Fights Poverty",
      description:
        "We help communities escape poverty by unlocking opportunity through skills, literacy, and lifelong learning.",
    },
    {
      icon: Rocket,
      title: "High-Impact Software",
      description:
        "We design technology that scales human potential — closing educational gaps across Latin America.",
    },
  ];

  const benefits = [
    {
      icon: BookOpen,
      title: "Unified Learning Ecosystem",
      description:
        "Videos, courses, AI tutors, learning paths, games and assessments — all in one place built for students, teachers and institutions.",
    },
    {
      icon: Brain,
      title: "AI That Teaches",
      description:
        "Personalized AI tutors, instant feedback, adaptive study plans and content generation that meet each student where they are.",
    },
    {
      icon: Trophy,
      title: "Gamified Motivation",
      description:
        "XP, levels, trivia battles, achievements and live games that turn learning into a habit students actually love.",
    },
    {
      icon: Users,
      title: "Communities & Institutions",
      description:
        "Tools for schools, universities and creators to manage, evaluate and grow their learning communities.",
    },
    {
      icon: Languages,
      title: "Built for Latin America",
      description:
        "Designed with the cultural, linguistic and connectivity realities of LATAM — works offline-ready and on low-end devices.",
    },
    {
      icon: ShieldCheck,
      title: "Safe & Inclusive",
      description:
        "A protected environment with privacy by design, content moderation and accessibility at its core.",
    },
    {
      icon: Zap,
      title: "Instant Creation",
      description:
        "Creators and teachers publish capsules, quizzes, learning paths and live games in minutes — not weeks.",
    },
    {
      icon: TrendingUp,
      title: "Measurable Impact",
      description:
        "Real analytics for students, teachers and leaders, so progress and outcomes are always visible.",
    },
  ];

  const stats = [
    { value: "20+", label: "Countries reached" },
    { value: "100+", label: "Partner institutions" },
    { value: "50K+", label: "Learning resources" },
    { value: "0$", label: "Cost to start learning" },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-br from-pink/20 via-background to-background"
        />
        <div
          aria-hidden
          className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-pink/30 blur-3xl -z-10"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl -z-10"
        />

        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-pink" />
            About Sedefy
          </div>
          <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
            Knowledge is the shortest path{" "}
            <span className="bg-gradient-to-r from-pink to-primary bg-clip-text text-transparent">
              out of poverty.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
            We are an ecosystem with one mission:{" "}
            <span className="text-foreground font-medium">
              democratize education
            </span>{" "}
            and help communities across Latin America break the cycle of
            poverty through learning.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="pink">
              <Link to="/auth">
                Join the movement <ArrowRight className="ml-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/">Explore the platform</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Mission pillars */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="max-w-2xl">
            <span className="text-sm font-semibold uppercase tracking-wider text-pink">
              Our mission
            </span>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
              An ecosystem built to close the educational gap.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              We design high-impact software that fights educational
              inequality and school dropout across Latin America — putting
              powerful learning tools in the hands of every student, teacher
              and institution.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {pillars.map((p) => (
              <Card key={p.title} className="border-border/60 bg-card/60 backdrop-blur transition-colors hover:border-pink/50">
                <CardContent className="p-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink/10 text-pink">
                    <p.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{p.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">
                    {p.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-br from-pink to-primary bg-clip-text text-transparent">
                  {s.value}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="flex items-end justify-between flex-wrap gap-6">
            <div className="max-w-2xl">
              <span className="text-sm font-semibold uppercase tracking-wider text-pink">
                What we build
              </span>
              <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
                Everything you need to learn, teach and grow.
              </h2>
            </div>
            <p className="max-w-md text-muted-foreground">
              A complete suite of products built to eliminate educational
              barriers and keep students engaged from their first lesson to
              their first job.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-pink/60 hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-pink/20 to-primary/10 text-pink">
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {b.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact / Why LATAM */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28 grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-pink">
              Why Latin America
            </span>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
              Closing the gap that holds a continent back.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Millions of students in Latin America drop out of school every
              year — not from a lack of talent, but from a lack of access,
              tools and opportunity. We exist to change that equation.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Lower the cost of quality education to nearly zero.",
                "Reduce school dropout with engaging, gamified learning.",
                "Empower teachers with AI and modern tools.",
                "Connect institutions, creators and learners in one place.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink/15 text-pink">
                    <Target className="h-3 w-3" />
                  </div>
                  <span className="text-foreground/90">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Card className="border-pink/30 bg-gradient-to-br from-pink/10 via-card to-card">
            <CardContent className="p-8 md:p-10">
              <GraduationCap className="h-10 w-10 text-pink" />
              <blockquote className="mt-6 text-xl md:text-2xl font-medium leading-relaxed">
                “Education is the most powerful weapon you can use to change
                the world. We're building the ecosystem that puts it in
                everyone's hands.”
              </blockquote>
              <div className="mt-6 text-sm text-muted-foreground">
                — The Sedefy team
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Help us democratize education.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you're a student, teacher, creator or institution — there's
            a place for you in the Sedefy ecosystem.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="pink">
              <Link to="/auth">
                Get started free <ArrowRight className="ml-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/pricing">See our plans</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AboutUs;
