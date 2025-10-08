import { useNavigate } from "react-router-dom";
import { Trophy, Star, Eye, Heart, BookmarkCheck, Award, Zap, TrendingUp, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";

const Achievements = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const xpActivities = [
    {
      icon: Eye,
      title: "Ver Contenido",
      xp: 10,
      description: "Gana 10 XP por cada video o documento que visualices",
      color: "text-blue-500",
    },
    {
      icon: Heart,
      title: "Dar Me Gusta",
      xp: 5,
      description: "Gana 5 XP al dar like a contenido de calidad",
      color: "text-red-500",
    },
    {
      icon: BookmarkCheck,
      title: "Guardar Contenido",
      xp: 5,
      description: "Gana 5 XP al guardar contenido para después",
      color: "text-yellow-500",
    },
    {
      icon: Star,
      title: "Completar Quiz",
      xp: 50,
      description: "Gana hasta 50 XP al completar quizzes educativos",
      color: "text-purple-500",
    },
  ];

  const achievementLevels = [
    {
      level: "Principiante",
      xpRequired: 0,
      icon: "🌱",
      benefits: ["Acceso al contenido público", "Perfil básico"],
    },
    {
      level: "Estudiante",
      xpRequired: 500,
      icon: "📚",
      benefits: ["Badge de estudiante", "Acceso a contenido exclusivo"],
    },
    {
      level: "Explorador",
      xpRequired: 1500,
      icon: "🔍",
      benefits: ["Badge de explorador", "Acceso a rutas de aprendizaje"],
    },
    {
      level: "Maestro",
      xpRequired: 5000,
      icon: "🎓",
      benefits: ["Badge de maestro", "Crear contenido destacado"],
    },
    {
      level: "Leyenda",
      xpRequired: 15000,
      icon: "⭐",
      benefits: ["Badge de leyenda", "Mentor de la comunidad"],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Logros y XP</h1>
                <p className="text-sm text-muted-foreground">
                  Aprende y gana experiencia
                </p>
              </div>
            </div>
            {!user && (
              <Button onClick={() => navigate("/auth")} size="sm">
                <LogIn className="w-4 h-4 mr-2" />
                Entrar
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* XP Info Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary" />
              <CardTitle>¿Cómo Ganar XP?</CardTitle>
            </div>
            <CardDescription>
              {user 
                ? "Realiza estas actividades para ganar puntos de experiencia"
                : "Inicia sesión para comenzar a ganar puntos de experiencia"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {xpActivities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div
                  key={activity.title}
                  className="flex items-start gap-4 p-4 rounded-lg bg-card border"
                >
                  <div className={`p-3 rounded-full bg-background ${activity.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold">{activity.title}</h3>
                      <Badge variant="secondary" className="gap-1">
                        <TrendingUp className="w-3 h-3" />
                        +{activity.xp} XP
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Achievement Levels */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="w-6 h-6 text-primary" />
              <CardTitle>Niveles de Logros</CardTitle>
            </div>
            <CardDescription>
              Desbloquea recompensas al alcanzar cada nivel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {achievementLevels.map((level, index) => (
              <div
                key={level.level}
                className={`p-4 rounded-lg border ${
                  index === 0 ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{level.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg">{level.level}</h3>
                      <Badge variant={index === 0 ? "default" : "outline"}>
                        {level.xpRequired.toLocaleString()} XP
                      </Badge>
                    </div>
                    <ul className="space-y-1">
                      {level.benefits.map((benefit) => (
                        <li
                          key={benefit}
                          className="text-sm text-muted-foreground flex items-center gap-2"
                        >
                          <div className="w-1 h-1 rounded-full bg-primary" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* CTA */}
        {!user && (
          <Card className="border-primary bg-gradient-to-r from-primary/10 to-secondary/10">
            <CardContent className="p-6 text-center space-y-4">
              <div className="text-5xl mb-2">🚀</div>
              <h3 className="text-xl font-bold">¡Comienza tu Aventura!</h3>
              <p className="text-muted-foreground">
                Inicia sesión para empezar a ganar XP, desbloquear logros y
                competir con otros estudiantes
              </p>
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="w-full"
              >
                Crear Cuenta Gratis
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Achievements;
