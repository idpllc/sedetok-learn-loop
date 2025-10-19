import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Star, Eye, Heart, BookmarkCheck, Award, Zap, TrendingUp, LogIn, Crown, ArrowLeft } from "lucide-react";
import { xpLevels, getUserLevel } from "@/lib/xpLevels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Achievements = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myXP, setMyXP] = useState<number | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myLevel, setMyLevel] = useState<string>("Principiante");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Fetch top leaderboard
      const { data: top, error: lbError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, institution, experience_points')
        .order('experience_points', { ascending: false })
        .limit(10);
      if (!lbError && top) setLeaderboard(top);

      // Fetch my XP and rank if logged in
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: me } = await supabase
          .from('profiles')
          .select('experience_points, username')
          .eq('id', authUser.id)
          .maybeSingle();
        if (me) {
          const xp = me.experience_points || 0;
          setMyXP(xp);
          
          // Calcular nivel actual
          const level = getUserLevel(xp);
          setMyLevel(level.level);
          
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gt('experience_points', xp);
          setMyRank((count || 0) + 1);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const xpActivities = [
    {
      icon: Eye,
      title: "Ver Contenido Completo",
      xp: 5,
      description: "Gana 5 XP por cada video o documento que completes",
      color: "text-blue-500",
    },
    {
      icon: Heart,
      title: "Dar Me Gusta",
      xp: 10,
      description: "Gana 10 XP al dar like a contenido de calidad",
      color: "text-red-500",
    },
    {
      icon: BookmarkCheck,
      title: "Guardar Contenido",
      xp: 15,
      description: "Gana 15 XP al guardar contenido para después",
      color: "text-yellow-500",
    },
    {
      icon: Star,
      title: "Completar Quiz",
      xp: 50,
      description: "Gana 50 XP al completar quizzes educativos",
      color: "text-purple-500",
    },
    {
      icon: Trophy,
      title: "Completar Ruta de Aprendizaje",
      xp: 1000,
      description: "Gana 1000 XP al completar una ruta completa",
      color: "text-green-500",
    },
    {
      icon: Award,
      title: "Crear Contenido",
      xp: 1000,
      description: "Gana 1000 XP al subir videos o documentos",
      color: "text-orange-500",
    },
    {
      icon: Zap,
      title: "Crear Quiz",
      xp: 1500,
      description: "Gana 1500 XP al crear un quiz educativo",
      color: "text-cyan-500",
    },
    {
      icon: TrendingUp,
      title: "Crear Ruta de Aprendizaje",
      xp: 3000,
      description: "Gana 3000 XP al crear una ruta completa",
      color: "text-indigo-500",
    },
  ];

  // Usar xpLevels importado en lugar de achievementLevels local
  const achievementLevels = xpLevels;

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-background pb-20 md:ml-64 pt-20 md:pt-0">
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
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
        {/* Podio de Logros */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="w-6 h-6 text-primary" />
              <CardTitle>Podio de Logros</CardTitle>
            </div>
            <CardDescription>Top 3 usuarios por XP</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay datos del podio.</p>
            ) : (
              <div className="grid grid-cols-3 gap-4 items-end">
                {leaderboard.slice(0,3).map((u, idx) => (
                  <div key={u.id} className={`text-center p-3 rounded-lg border ${idx === 1 ? 'translate-y-2' : ''}`}>
                    <div className={`text-3xl mb-2 ${idx === 0 ? 'order-2' : ''}`}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                    </div>
                    <div className="text-sm font-semibold truncate">{u.username || 'Usuario'}</div>
                    <div className="text-xs text-muted-foreground">{u.experience_points || 0} XP</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mi posición */}
        <Card>
          <CardHeader>
            <CardTitle>Mi Posición</CardTitle>
            <CardDescription>Tu lugar en la clasificación general</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : user ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Posición actual</p>
                    <p className="text-2xl font-bold">#{myRank ?? '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Tus puntos</p>
                    <p className="text-2xl font-bold">{(myXP ?? 0).toLocaleString()} XP</p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{getUserLevel(myXP ?? 0).icon}</div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nivel actual</p>
                      <p className="text-xl font-bold">{myLevel}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Inicia sesión para ver tu posición y puntos.</p>
            )}
          </CardContent>
        </Card>

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
    </>
  );
};

export default Achievements;
