import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLiveGames } from "@/hooks/useLiveGames";
import { Gamepad2, Plus, Play, Trash2, Users, ArrowLeft, Pencil, RotateCcw, History, Zap, QrCode, BarChart3, Clock, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import CreateLiveGameModal from "@/components/live-games/CreateLiveGameModal";
import JoinLiveGameModal from "@/components/live-games/JoinLiveGameModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";

const LiveGames = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { games, isLoading, deleteGame, replayGame } = useLiveGames();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showInfo, setShowInfo] = useState(() => {
    return !localStorage.getItem('liveGamesInfoDismissed');
  });

  const handleReplayGame = async (gameId: string) => {
    try {
      const result = await replayGame.mutateAsync(gameId);
      navigate(`/live-games/host/${result.id}`);
    } catch (error) {
      console.error("Error replaying game:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">En Espera</Badge>;
      case 'in_progress':
        return <Badge className="bg-green-500 text-white">En Progreso</Badge>;
      case 'finished':
        return <Badge variant="outline">Finalizado</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-background pb-20 md:ml-64 pt-14 md:pt-0">
        {/* Sticky Header */}
        <header className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="px-4 py-3">
            {/* Top row: back + title + actions */}
            <div className="flex items-center gap-3 mb-3">
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 -ml-1 gap-1.5"
                onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Volver</span>
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-foreground leading-tight">Juegos en Vivo</h1>
                <p className="text-xs text-muted-foreground">Tipo Kahoot, en tiempo real</p>
              </div>
            </div>
            {/* Action buttons row */}
            <div className="flex gap-2">
              <Button
                onClick={() => setShowJoinModal(true)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Gamepad2 className="w-4 h-4 mr-1.5" />
                Unirme
              </Button>
              <Button
                onClick={() => setShowCreateModal(true)}
                size="sm"
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Crear Juego
              </Button>
            </div>
          </div>
        </header>

        <div className="px-4 py-4 space-y-4">
          {/* Info/Explainer Section */}
          {showInfo && (
            <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <div className="p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">¿Qué son los Juegos en Vivo?</h3>
                      <p className="text-xs text-muted-foreground">Competencias interactivas en tiempo real</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground"
                    onClick={() => {
                      setShowInfo(false);
                      localStorage.setItem('liveGamesInfoDismissed', 'true');
                    }}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  Los Juegos en Vivo son competencias <strong className="text-foreground">tipo Kahoot</strong> donde el docente proyecta preguntas y los estudiantes responden desde sus dispositivos en tiempo real. Ideal para repasar temas, evaluar de forma lúdica y mantener la atención del grupo.
                </p>

                {/* Benefits */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background/60">
                    <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Respuesta rápida</p>
                      <p className="text-[11px] text-muted-foreground">Temporizador por pregunta con alertas sonoras</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background/60">
                    <QrCode className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Acceso fácil</p>
                      <p className="text-[11px] text-muted-foreground">Los alumnos entran con un PIN de 6 dígitos o QR</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background/60">
                    <BarChart3 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Resultados al instante</p>
                      <p className="text-[11px] text-muted-foreground">Ranking en vivo con puntajes y aciertos</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background/60">
                    <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Reutilizable</p>
                      <p className="text-[11px] text-muted-foreground">Reusa juegos anteriores con un nuevo PIN</p>
                    </div>
                  </div>
                </div>

                {/* How to create */}
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">¿Cómo crear un juego?</h4>
                  <ol className="space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <span>Toca <strong className="text-foreground">"Crear Juego"</strong> y escribe un título.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <span>Agrega preguntas de opción múltiple con imágenes y retroalimentación. También puedes <strong className="text-foreground">generarlas con IA</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <span>Comparte el <strong className="text-foreground">PIN</strong> con tus estudiantes e inicia la partida.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                      <span>Proyecta las preguntas mientras ellos responden desde sus celulares. ¡El ranking se actualiza en vivo!</span>
                    </li>
                  </ol>
                </div>

                {!user && (
                  <p className="text-xs text-muted-foreground bg-background/60 rounded-lg p-2.5 text-center">
                    💡 <strong className="text-foreground">¿Eres estudiante?</strong> Solo necesitas el PIN de 6 dígitos que te dará tu profesor. Toca "Unirme" para jugar.
                  </p>
                )}
              </div>
            </Card>
          )}

          {!showInfo && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground text-xs"
              onClick={() => {
                setShowInfo(true);
                localStorage.removeItem('liveGamesInfoDismissed');
              }}
            >
              <ChevronDown className="w-3.5 h-3.5 mr-1" />
              ¿Qué son los Juegos en Vivo?
            </Button>
          )}
          <Tabs defaultValue="my-games" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="my-games">Mis Juegos</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
            </TabsList>

            <TabsContent value="my-games">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-4">
                      <Skeleton className="h-5 w-3/4 mb-3" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-9 w-full" />
                    </Card>
                  ))}
                </div>
              ) : games && games.filter(g => g.status !== 'finished').length > 0 ? (
                <div className="space-y-3">
                  {games.filter(g => g.status !== 'finished').map((game) => (
                    <Card key={game.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate mb-1">{game.title}</h3>
                          {getStatusBadge(game.status)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm mb-4 bg-muted/50 rounded-lg px-3 py-2">
                        <span className="text-muted-foreground font-medium">PIN</span>
                        <span className="font-mono font-bold text-xl text-primary tracking-widest">{game.pin}</span>
                      </div>

                      <div className="flex gap-2">
                        {game.status === 'waiting' && (
                          <>
                            <Button
                              onClick={() => navigate(`/live-games/host/${game.id}`)}
                              className="flex-1"
                              size="sm"
                            >
                              <Play className="w-4 h-4 mr-1.5" />
                              Iniciar
                            </Button>
                            <Button
                              onClick={() => navigate(`/live-games/edit/${game.id}`)}
                              variant="outline"
                              size="sm"
                              className="px-3"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {game.status === 'in_progress' && (
                          <Button
                            onClick={() => navigate(`/live-games/host/${game.id}`)}
                            className="flex-1"
                            size="sm"
                          >
                            <Users className="w-4 h-4 mr-1.5" />
                            Ver Juego
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="px-3">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar juego?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteGame.mutate(game.id)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-10 text-center">
                  <Gamepad2 className="w-14 h-14 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-1">No tienes juegos creados</h3>
                  <p className="text-sm text-muted-foreground mb-5">
                    Crea tu primer juego en vivo y compite con tus estudiantes
                  </p>
                  <Button onClick={() => setShowCreateModal(true)} size="sm">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Crear Primer Juego
                  </Button>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Card key={i} className="p-4">
                      <Skeleton className="h-5 w-3/4 mb-3" />
                      <Skeleton className="h-9 w-full" />
                    </Card>
                  ))}
                </div>
              ) : games && games.filter(g => g.status === 'finished').length > 0 ? (
                <div className="space-y-3">
                  {games.filter(g => g.status === 'finished').map((game) => (
                    <Card key={game.id} className="p-4">
                      <div className="mb-3">
                        <h3 className="font-semibold text-base mb-1">{game.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          Finalizado: {new Date(game.finished_at!).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => navigate(`/live-games/results/${game.id}`)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <History className="w-4 h-4 mr-1.5" />
                          Resultados
                        </Button>
                        <Button
                          onClick={() => navigate(`/live-games/edit/${game.id}`)}
                          variant="outline"
                          size="sm"
                          className="px-3"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleReplayGame(game.id)}
                          size="sm"
                          className="flex-1"
                          disabled={replayGame.isPending}
                        >
                          <RotateCcw className="w-4 h-4 mr-1.5" />
                          Reusar
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-10 text-center">
                  <p className="text-muted-foreground text-sm">No hay juegos finalizados</p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <CreateLiveGameModal open={showCreateModal} onOpenChange={setShowCreateModal} />
        <JoinLiveGameModal open={showJoinModal} onOpenChange={setShowJoinModal} />
        <BottomNav />
      </div>
    </>
  );
};

export default LiveGames;
