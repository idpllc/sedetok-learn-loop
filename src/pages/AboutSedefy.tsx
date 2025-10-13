import { ArrowLeft, Sparkles, Users, BookOpen, Trophy, Heart, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";

const AboutSedefy = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: BookOpen,
      title: "Contenido Educativo",
      description: "Aprende con videos, documentos y recursos de calidad creados por expertos y la comunidad.",
    },
    {
      icon: Users,
      title: "Comunidad Global",
      description: "Conecta con estudiantes y creadores de todo el mundo compartiendo conocimiento.",
    },
    {
      icon: Trophy,
      title: "Sistema de Logros",
      description: "Gana XP, desbloquea niveles y compite en la clasificación mientras aprendes.",
    },
    {
      icon: Globe,
      title: "Acceso Universal",
      description: "Educación gratuita y accesible para todos, sin importar dónde estés.",
    },
  ];

  const stats = [
    { value: "10K+", label: "Usuarios Activos" },
    { value: "50K+", label: "Recursos Educativos" },
    { value: "100+", label: "Instituciones" },
    { value: "20+", label: "Países" },
  ];

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-background pb-20 md:ml-64 pt-20 md:pt-0">
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
          {/* Hero Section */}
          <section className="text-center space-y-6 py-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Sobre Nosotros
            </div>
            <h1 className="text-4xl md:text-6xl font-bold">
              Democratizando la Educación
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Sedefy es una plataforma educativa que conecta a estudiantes, creadores y conocimiento de manera gratuita y accesible para todos.
            </p>
          </section>

          {/* Mission */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
            <CardContent className="p-8">
              <div className="flex items-start gap-4">
                <Heart className="w-8 h-8 text-primary shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold mb-3">Nuestra Misión</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Creemos que la educación es un derecho fundamental. Nuestra misión es proporcionar una plataforma donde cualquier persona pueda aprender, compartir conocimiento y crecer profesionalmente, sin barreras económicas o geográficas. Sedefy transforma la manera en que las personas acceden al conocimiento, haciendo que el aprendizaje sea entretenido, social y gratificante.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-center">¿Qué Hace Especial a Sedefy?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                          <p className="text-muted-foreground text-sm">{feature.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Stats */}
          <section className="py-12">
            <Card className="bg-gradient-to-r from-primary to-secondary text-primary-foreground">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-center mb-8">Nuestro Impacto</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {stats.map((stat) => (
                    <div key={stat.label} className="text-center">
                      <div className="text-4xl font-bold mb-2">{stat.value}</div>
                      <div className="text-sm opacity-90">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Vision */}
          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-center">Nuestra Visión</h2>
            <Card>
              <CardContent className="p-8">
                <p className="text-muted-foreground leading-relaxed text-center">
                  Imaginamos un mundo donde cada persona tiene acceso ilimitado al conocimiento y las herramientas necesarias para alcanzar su máximo potencial. Sedefy será la plataforma líder que transforme la educación global, creando una comunidad donde aprender sea tan natural y atractivo como socializar en redes tradicionales.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* CTA */}
          <section className="text-center py-12">
            <Card className="border-primary bg-gradient-to-br from-primary/10 to-secondary/10">
              <CardContent className="p-8 space-y-4">
                <h2 className="text-3xl font-bold">Únete a Nuestra Comunidad</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Sé parte del movimiento que está transformando la educación. Comparte tu conocimiento, aprende de otros y crece junto a miles de estudiantes en todo el mundo.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button size="lg" onClick={() => navigate("/auth")}>
                    Comenzar Ahora
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate("/creator-program")}>
                    Programa de Creadores
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>

        <BottomNav />
      </div>
    </>
  );
};

export default AboutSedefy;
