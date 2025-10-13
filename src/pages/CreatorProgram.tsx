import { ArrowLeft, Video, DollarSign, Users, TrendingUp, Award, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";

const CreatorProgram = () => {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: DollarSign,
      title: "Monetización",
      description: "Gana dinero compartiendo tu conocimiento con la comunidad.",
    },
    {
      icon: Users,
      title: "Audiencia Global",
      description: "Alcanza a miles de estudiantes en todo el mundo.",
    },
    {
      icon: TrendingUp,
      title: "Crecimiento",
      description: "Herramientas y analytics para hacer crecer tu contenido.",
    },
    {
      icon: Award,
      title: "Reconocimiento",
      description: "Badge de creador verificado y destaque en la plataforma.",
    },
  ];

  const requirements = [
    "Ser mayor de 18 años",
    "Tener al menos 1,000 seguidores",
    "Publicar contenido educativo de calidad",
    "Cumplir con las políticas de la comunidad",
    "Tener al menos 10 publicaciones",
  ];

  const tiers = [
    {
      name: "Creador Emergente",
      followers: "1K - 10K",
      benefits: ["Monetización básica", "Analytics básicos", "Badge de creador"],
      color: "from-blue-500/20 to-blue-600/20",
    },
    {
      name: "Creador Establecido",
      followers: "10K - 50K",
      benefits: ["Mayor % de ingresos", "Analytics avanzados", "Soporte prioritario", "Colaboraciones"],
      color: "from-purple-500/20 to-purple-600/20",
    },
    {
      name: "Creador Elite",
      followers: "50K+",
      benefits: ["Máximo % de ingresos", "Manager dedicado", "Eventos exclusivos", "Merchandising"],
      color: "from-amber-500/20 to-amber-600/20",
    },
  ];

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-background pb-20 md:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8 space-y-12">
          {/* Hero */}
          <section className="text-center space-y-6 py-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
              <Video className="w-4 h-4" />
              Programa de Creadores
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">
              Comparte tu Conocimiento,<br />Gana Reconocimiento
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Únete al programa de creadores de Sedefy y monetiza tu pasión por enseñar mientras impactas la vida de miles de estudiantes.
            </p>
            <Button size="lg" className="mt-4" onClick={() => navigate("/auth")}>
              Aplicar Ahora
            </Button>
          </section>

          {/* Benefits */}
          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-center">Beneficios del Programa</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <Card key={benefit.title}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-2">{benefit.title}</h3>
                          <p className="text-muted-foreground text-sm">{benefit.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Tiers */}
          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-center">Niveles de Creadores</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {tiers.map((tier) => (
                <Card key={tier.name} className={`bg-gradient-to-br ${tier.color}`}>
                  <CardHeader>
                    <CardTitle>{tier.name}</CardTitle>
                    <Badge variant="secondary" className="w-fit">
                      {tier.followers} seguidores
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {tier.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Requirements */}
          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-center">Requisitos</h2>
            <Card>
              <CardContent className="p-8">
                <ul className="space-y-4 max-w-2xl mx-auto">
                  {requirements.map((req) => (
                    <li key={req} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{req}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* How it works */}
          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-center">¿Cómo Funciona?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  step: "1",
                  title: "Aplica",
                  description: "Completa el formulario de aplicación con tu información y portfolio.",
                },
                {
                  step: "2",
                  title: "Revisión",
                  description: "Nuestro equipo revisará tu aplicación en 48 horas.",
                },
                {
                  step: "3",
                  title: "Crea",
                  description: "Una vez aprobado, comienza a crear y monetizar tu contenido.",
                },
              ].map((item) => (
                <Card key={item.step}>
                  <CardContent className="p-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">
                      {item.step}
                    </div>
                    <h3 className="font-bold text-lg">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="text-center py-8">
            <Card className="border-primary bg-gradient-to-br from-primary/10 to-secondary/10">
              <CardContent className="p-8 space-y-4">
                <h2 className="text-2xl font-bold">¿Listo para Comenzar?</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Aplica al programa de creadores hoy y comienza a monetizar tu pasión por enseñar.
                </p>
                <Button size="lg" onClick={() => navigate("/auth")}>
                  Aplicar al Programa
                </Button>
              </CardContent>
            </Card>
          </section>
        </main>

        <BottomNav />
      </div>
    </>
  );
};

export default CreatorProgram;
