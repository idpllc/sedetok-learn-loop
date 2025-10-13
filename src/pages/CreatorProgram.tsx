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
      icon: Award,
      title: "Verificación de Creador",
      description: "Obtén el badge de creador verificado y destaca en la plataforma.",
    },
    {
      icon: Users,
      title: "Audiencia Global",
      description: "Alcanza a miles de estudiantes en todo el mundo con tu contenido.",
    },
    {
      icon: TrendingUp,
      title: "Analytics y Estadísticas",
      description: "Herramientas para medir el impacto de tu contenido educativo.",
    },
    {
      icon: Video,
      title: "Contenido Destacado",
      description: "Tu contenido aprobado aparecerá en secciones destacadas de la plataforma.",
    },
  ];

  const requirements = [
    "Crear una cuenta en Sedefy",
    "Publicar contenido educativo de calidad",
    "Cumplir con las políticas de la comunidad",
    "Pasar el proceso de revisión de contenido",
    "Mantener estándares educativos",
  ];

  const verificationLevels = [
    {
      name: "Creador Nuevo",
      description: "Inicio del Proceso",
      benefits: ["Publica contenido libremente", "Contenido sujeto a revisión", "Acceso a herramientas básicas"],
      color: "from-blue-500/20 to-blue-600/20",
    },
    {
      name: "Creador Aprobado",
      description: "Contenido Revisado",
      benefits: ["Contenido aprobado publicado", "Feedback del equipo de revisión", "Mejores posiciones en búsqueda"],
      color: "from-purple-500/20 to-purple-600/20",
    },
    {
      name: "Creador Verificado",
      description: "Cuenta Verificada",
      benefits: ["Badge de verificación", "Publicación prioritaria", "Soporte dedicado", "Contenido destacado"],
      color: "from-amber-500/20 to-amber-600/20",
    },
    {
      name: "Creador Monetizado",
      description: "Elegible para Monetización",
      benefits: ["2,000+ seguidores", "10,000+ reproducciones", "Monetiza tu contenido", "Ingresos por visualizaciones"],
      color: "from-emerald-500/20 to-emerald-600/20",
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
              Comparte tu Conocimiento,<br />Inspira a Otros
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Cualquier persona puede ser creador en Sedefy. Publica contenido educativo de calidad y conviértete en un creador verificado de nuestra comunidad.
            </p>
            <Button size="lg" className="mt-4" onClick={() => navigate("/create")}>
              Comenzar a Crear
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

          {/* Verification Levels */}
          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-center">Proceso de Verificación</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {verificationLevels.map((level) => (
                <Card key={level.name} className={`bg-gradient-to-br ${level.color}`}>
                  <CardHeader>
                    <CardTitle className="text-base">{level.name}</CardTitle>
                    <Badge variant="secondary" className="w-fit text-xs">
                      {level.description}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {level.benefits.map((benefit) => (
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

          {/* Monetization Requirements */}
          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-center">Requisitos para Monetización</h2>
            <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
                    <DollarSign className="w-4 h-4" />
                    Programa de Monetización
                  </div>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Para ser elegible para monetización, tu cuenta de creador debe cumplir con los siguientes requisitos mínimos:
                  </p>
                  <div className="grid md:grid-cols-2 gap-6 mt-8">
                    <Card>
                      <CardContent className="p-6 text-center">
                        <Users className="w-12 h-12 text-primary mx-auto mb-3" />
                        <div className="text-3xl font-bold text-primary mb-2">2,000+</div>
                        <p className="text-sm text-muted-foreground">Seguidores mínimos</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6 text-center">
                        <TrendingUp className="w-12 h-12 text-primary mx-auto mb-3" />
                        <div className="text-3xl font-bold text-primary mb-2">10,000+</div>
                        <p className="text-sm text-muted-foreground">Reproducciones totales</p>
                      </CardContent>
                    </Card>
                  </div>
                  <p className="text-sm text-muted-foreground italic pt-4">
                    Una vez alcanzados estos requisitos, podrás aplicar al programa de monetización y comenzar a generar ingresos por tu contenido educativo.
                  </p>
                </div>
              </CardContent>
            </Card>
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
            <div className="grid md:grid-cols-4 gap-6">
              {[
                {
                  step: "1",
                  title: "Crea tu Cuenta",
                  description: "Regístrate gratis en Sedefy y completa tu perfil de creador.",
                },
                {
                  step: "2",
                  title: "Publica Contenido",
                  description: "Crea y publica videos, documentos o quizzes educativos de calidad.",
                },
                {
                  step: "3",
                  title: "Revisión",
                  description: "Nuestro equipo revisa tu contenido para asegurar calidad educativa.",
                },
                {
                  step: "4",
                  title: "Verificación",
                  description: "Una vez aprobado consistentemente, obtén tu verificación de creador.",
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

          {/* Review Process */}
          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-center">Proceso de Revisión de Contenido</h2>
            <Card>
              <CardContent className="p-8 space-y-6">
                <p className="text-muted-foreground text-center">
                  Todo el contenido publicado en Sedefy pasa por un proceso de revisión para garantizar la calidad educativa y el cumplimiento de nuestras políticas.
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-primary" />
                      Qué Revisamos
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Calidad del contenido educativo</li>
                      <li>• Precisión de la información</li>
                      <li>• Cumplimiento de políticas</li>
                      <li>• Respeto a derechos de autor</li>
                      <li>• Adecuación del nivel educativo</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" />
                      Beneficios de la Aprobación
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Contenido visible públicamente</li>
                      <li>• Mayor alcance en búsquedas</li>
                      <li>• Posibilidad de destacarse</li>
                      <li>• Camino a verificación</li>
                      <li>• Reconocimiento en la comunidad</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* CTA */}
          <section className="text-center py-8">
            <Card className="border-primary bg-gradient-to-br from-primary/10 to-secondary/10">
              <CardContent className="p-8 space-y-4">
                <h2 className="text-2xl font-bold">¿Listo para Comenzar?</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Únete a la comunidad de creadores de Sedefy hoy. Comparte tu conocimiento y ayuda a miles de estudiantes a aprender.
                </p>
                <Button size="lg" onClick={() => navigate("/create")}>
                  Crear mi Primer Contenido
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
