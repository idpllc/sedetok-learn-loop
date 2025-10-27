import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Trophy, Star, Eye, Heart, BookmarkCheck, Award, Zap, TrendingUp, 
  LogIn, Crown, ArrowLeft, History, Coins, Gamepad2, UserCircle, 
  FileText, Briefcase, GraduationCap, Target, MessageSquare 
} from "lucide-react";
import { xpLevels, getUserLevel } from "@/lib/xpLevels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEducoins } from "@/hooks/useEducoins";

const Achievements = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance: educoinBalance } = useEducoins();

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
      description: "Completa videos o documentos educativos",
      color: "text-blue-500",
      category: "Aprendizaje"
    },
    {
      icon: Heart,
      title: "Dar Me Gusta",
      xp: 10,
      description: "Interactúa con contenido de calidad",
      color: "text-red-500",
      category: "Interacción"
    },
    {
      icon: BookmarkCheck,
      title: "Guardar Contenido",
      xp: 15,
      description: "Organiza contenido para estudiar después",
      color: "text-yellow-500",
      category: "Interacción"
    },
    {
      icon: MessageSquare,
      title: "Comentar",
      xp: 20,
      description: "Participa en discusiones educativas",
      color: "text-pink-500",
      category: "Interacción"
    },
    {
      icon: Star,
      title: "Completar Quiz",
      xp: 50,
      description: "Demuestra tus conocimientos en quizzes",
      color: "text-purple-500",
      category: "Evaluación"
    },
    {
      icon: Gamepad2,
      title: "Completar Juego Educativo",
      xp: 100,
      description: "Aprende jugando y gana experiencia",
      color: "text-green-500",
      category: "Evaluación"
    },
    {
      icon: Trophy,
      title: "Completar Ruta de Aprendizaje",
      xp: 1000,
      description: "Finaliza una ruta completa de aprendizaje",
      color: "text-emerald-500",
      category: "Logros Mayores"
    },
    {
      icon: Award,
      title: "Crear Contenido",
      xp: 1000,
      description: "Comparte videos o documentos educativos",
      color: "text-orange-500",
      category: "Creación"
    },
    {
      icon: Zap,
      title: "Crear Quiz",
      xp: 1500,
      description: "Crea evaluaciones para otros estudiantes",
      color: "text-cyan-500",
      category: "Creación"
    },
    {
      icon: FileText,
      title: "Crear Hoja de Vida",
      xp: 2000,
      description: "Genera tu CV profesional personalizado",
      color: "text-violet-500",
      category: "Desarrollo Profesional"
    },
    {
      icon: TrendingUp,
      title: "Crear Ruta de Aprendizaje",
      xp: 3000,
      description: "Diseña rutas completas de conocimiento",
      color: "text-indigo-500",
      category: "Creación"
    },
    {
      icon: GraduationCap,
      title: "Agregar Educación Formal",
      xp: 50,
      description: "Completa tu perfil con tu educación",
      color: "text-blue-600",
      category: "Perfil"
    },
    {
      icon: Briefcase,
      title: "Agregar Experiencia Laboral",
      xp: 50,
      description: "Documenta tu trayectoria profesional",
      color: "text-slate-600",
      category: "Perfil"
    },
    {
      icon: Award,
      title: "Agregar Habilidades",
      xp: 50,
      description: "Destaca tus competencias técnicas y blandas",
      color: "text-amber-600",
      category: "Perfil"
    },
    {
      icon: Target,
      title: "Agregar Formación Complementaria",
      xp: 50,
      description: "Registra cursos y certificaciones",
      color: "text-teal-600",
      category: "Perfil"
    },
    {
      icon: Trophy,
      title: "Agregar Proyectos",
      xp: 50,
      description: "Muestra tus proyectos destacados",
      color: "text-rose-600",
      category: "Perfil"
    },
    {
      icon: UserCircle,
      title: "Completar Perfil 360°",
      xp: 500,
      description: "Completa todas las secciones de tu perfil",
      color: "text-fuchsia-500",
      category: "Logros Mayores"
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
                <div className="pt-4 border-t">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full gap-2">
                        <Zap className="w-4 h-4" />
                        ¿Cómo Ganar XP?
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <div className="flex items-center gap-2">
                          <Zap className="w-6 h-6 text-primary" />
                          <DialogTitle>¿Cómo Ganar XP?</DialogTitle>
                        </div>
                        <DialogDescription>
                          Realiza estas actividades para ganar puntos de experiencia y subir de nivel
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 mt-4">
                        {/* Group by category */}
                        {Object.entries(
                          xpActivities.reduce((acc, activity) => {
                            if (!acc[activity.category]) acc[activity.category] = [];
                            acc[activity.category].push(activity);
                            return acc;
                          }, {} as Record<string, typeof xpActivities>)
                        ).map(([category, activities]) => (
                          <div key={category} className="space-y-3">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              <div className="h-px flex-1 bg-border"></div>
                              <span className="text-primary">{category}</span>
                              <div className="h-px flex-1 bg-border"></div>
                            </h3>
                            <div className="space-y-2">
                              {activities.map((activity) => {
                                const Icon = activity.icon;
                                return (
                                  <div
                                    key={activity.title}
                                    className="flex items-start gap-3 p-3 rounded-lg bg-card border hover:border-primary/50 transition-colors"
                                  >
                                    <div className={`p-2 rounded-lg bg-background ${activity.color}`}>
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <h4 className="font-medium text-sm">{activity.title}</h4>
                                        <Badge variant="secondary" className="gap-1 shrink-0">
                                          <TrendingUp className="w-3 h-3" />
                                          +{activity.xp}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {activity.description}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        
                        <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                          <p className="text-sm text-center font-medium">
                            💡 <strong>Consejo:</strong> Combina diferentes actividades para maximizar tu XP y alcanzar nuevos niveles más rápido
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Inicia sesión para ver tu posición y puntos.</p>
                <div className="pt-4 border-t">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full gap-2">
                        <Zap className="w-4 h-4" />
                        ¿Cómo Ganar XP?
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <div className="flex items-center gap-2">
                          <Zap className="w-6 h-6 text-primary" />
                          <DialogTitle>¿Cómo Ganar XP?</DialogTitle>
                        </div>
                        <DialogDescription>
                          Inicia sesión para comenzar a ganar puntos de experiencia y subir de nivel
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 mt-4">
                        {/* Group by category */}
                        {Object.entries(
                          xpActivities.reduce((acc, activity) => {
                            if (!acc[activity.category]) acc[activity.category] = [];
                            acc[activity.category].push(activity);
                            return acc;
                          }, {} as Record<string, typeof xpActivities>)
                        ).map(([category, activities]) => (
                          <div key={category} className="space-y-3">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              <div className="h-px flex-1 bg-border"></div>
                              <span className="text-primary">{category}</span>
                              <div className="h-px flex-1 bg-border"></div>
                            </h3>
                            <div className="space-y-2">
                              {activities.map((activity) => {
                                const Icon = activity.icon;
                                return (
                                  <div
                                    key={activity.title}
                                    className="flex items-start gap-3 p-3 rounded-lg bg-card border hover:border-primary/50 transition-colors"
                                  >
                                    <div className={`p-2 rounded-lg bg-background ${activity.color}`}>
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <h4 className="font-medium text-sm">{activity.title}</h4>
                                        <Badge variant="secondary" className="gap-1 shrink-0">
                                          <TrendingUp className="w-3 h-3" />
                                          +{activity.xp}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {activity.description}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        
                        <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                          <p className="text-sm text-center font-medium">
                            💡 <strong>Consejo:</strong> Combina diferentes actividades para maximizar tu XP y alcanzar nuevos niveles más rápido
                          </p>
                        </div>

                        <Button onClick={() => navigate("/auth")} className="w-full" size="lg">
                          Crear Cuenta y Empezar a Ganar XP
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Educoins Balance */}
        {user && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Coins className="w-6 h-6 text-primary" />
                <CardTitle>Educoins</CardTitle>
              </div>
              <CardDescription>Tu moneda virtual para funciones premium</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Balance actual</p>
                    <p className="text-3xl font-bold text-primary">
                      {educoinBalance ?? 0} <span className="text-lg">Educoins</span>
                    </p>
                  </div>
                  <Coins className="w-16 h-16 text-primary/20" />
                </div>
                <div className="pt-4 border-t">
                  <Button 
                    onClick={() => navigate("/buy-educoins")}
                    className="w-full gap-2"
                  >
                    <Coins className="w-4 h-4" />
                    Comprar Educoins
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Usa Educoins para generar quizzes con IA
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}


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
            {achievementLevels.map((level, index) => {
              const isCurrentLevel = user && myLevel === level.level;
              return (
                <div
                  key={level.level}
                  className={`p-4 rounded-lg border ${
                    isCurrentLevel ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{level.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg">
                        {level.level}
                        {isCurrentLevel && <span className="ml-2 text-primary text-sm">(Actual)</span>}
                      </h3>
                      <Badge variant={isCurrentLevel ? "default" : "outline"}>
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
              );
            })}
          </CardContent>
        </Card>

        {/* Historial de XP */}
        {user && (
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <History className="w-12 h-12 text-primary mx-auto" />
              <h3 className="text-xl font-bold">Historial de XP</h3>
              <p className="text-muted-foreground">
                Revisa todas tus ganancias y gastos de puntos de experiencia
              </p>
              <Button
                size="lg"
                onClick={() => navigate("/xp-history")}
                className="w-full"
                variant="outline"
              >
                <History className="w-4 h-4 mr-2" />
                Ver Historial Completo
              </Button>
            </CardContent>
          </Card>
        )}

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
