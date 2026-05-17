import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { FloatingLanguageSelector } from "@/components/FloatingLanguageSelector";

const AboutUs = () => {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t("about.metaTitle");
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", t("about.metaDescription"));

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}/about-us`);
  }, [t]);

  const pillars = [
    { icon: Globe2, title: t("about.pillar1Title"), description: t("about.pillar1Desc") },
    { icon: HeartHandshake, title: t("about.pillar2Title"), description: t("about.pillar2Desc") },
    { icon: Rocket, title: t("about.pillar3Title"), description: t("about.pillar3Desc") },
  ];

  const benefits = [
    { icon: BookOpen, title: t("about.benefit1Title"), description: t("about.benefit1Desc") },
    { icon: Brain, title: t("about.benefit2Title"), description: t("about.benefit2Desc") },
    { icon: Trophy, title: t("about.benefit3Title"), description: t("about.benefit3Desc") },
    { icon: Users, title: t("about.benefit4Title"), description: t("about.benefit4Desc") },
    { icon: Languages, title: t("about.benefit5Title"), description: t("about.benefit5Desc") },
    { icon: ShieldCheck, title: t("about.benefit6Title"), description: t("about.benefit6Desc") },
    { icon: Zap, title: t("about.benefit7Title"), description: t("about.benefit7Desc") },
    { icon: TrendingUp, title: t("about.benefit8Title"), description: t("about.benefit8Desc") },
  ];

  const stats = [
    { value: "20+", label: t("about.statsCountries") },
    { value: "100+", label: t("about.statsInstitutions") },
    { value: "50K+", label: t("about.statsResources") },
    { value: "0$", label: t("about.statsCost") },
  ];

  const whys = [t("about.why1"), t("about.why2"), t("about.why3"), t("about.why4")];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <FloatingLanguageSelector />
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div aria-hidden className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl -z-10" />
        <div aria-hidden className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl -z-10" />

        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32 grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("about.badge")}
            </div>
            <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
              {t("about.heroTitle1")}{" "}
              <span className="bg-gradient-to-r from-primary to-primary bg-clip-text text-transparent">
                {t("about.heroTitle2")}
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
              {t("about.heroSubtitle")}{" "}
              <span className="text-foreground font-medium">{t("about.heroSubtitleHighlight")}</span>{" "}
              {t("about.heroSubtitleEnd")}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="default">
                <Link to="/auth">{t("about.ctaJoin")} <ArrowRight className="ml-1" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/">{t("about.ctaExplore")}</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div aria-hidden className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/30 to-primary/20 blur-2xl" />
            <img
              src="https://tsoqm1lrawz8zunu.public.blob.vercel-storage.com/institution/banners/1773886722037-Captura_de_pantalla_2026-03-18_a_las_9_17_41_p__m_.png"
              alt={t("about.heroTitle2")}
              width={1200}
              height={800}
              loading="lazy"
              className="relative rounded-2xl border border-border shadow-2xl w-full h-auto"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="max-w-2xl">
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">{t("about.missionLabel")}</span>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">{t("about.missionTitle")}</h2>
            <p className="mt-5 text-lg text-muted-foreground">{t("about.missionDescription")}</p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {pillars.map((p) => (
              <Card key={p.title} className="border-border/60 bg-card/60 backdrop-blur transition-colors hover:border-primary/50">
                <CardContent className="p-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <p.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{p.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{p.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-br from-primary to-primary bg-clip-text text-transparent">
                  {s.value}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="flex items-end justify-between flex-wrap gap-6">
            <div className="max-w-2xl">
              <span className="text-sm font-semibold uppercase tracking-wider text-primary">{t("about.whatLabel")}</span>
              <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">{t("about.whatTitle")}</h2>
            </div>
            <p className="max-w-md text-muted-foreground">{t("about.whatDescription")}</p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b) => (
              <div key={b.title} className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28 grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">{t("about.whyLabel")}</span>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">{t("about.whyTitle")}</h2>
            <p className="mt-5 text-lg text-muted-foreground">{t("about.whyDescription")}</p>
            <ul className="mt-8 space-y-4">
              {whys.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Target className="h-3 w-3" />
                  </div>
                  <span className="text-foreground/90">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
            <CardContent className="p-8 md:p-10">
              <GraduationCap className="h-10 w-10 text-primary" />
              <blockquote className="mt-6 text-xl md:text-2xl font-medium leading-relaxed">
                {t("about.quote")}
              </blockquote>
              <div className="mt-6 text-sm text-muted-foreground">{t("about.quoteAuthor")}</div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">{t("about.finalTitle")}</h2>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">{t("about.finalDescription")}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="default">
              <Link to="/auth">{t("about.ctaStart")} <ArrowRight className="ml-1" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/pricing">{t("about.ctaPlans")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AboutUs;
