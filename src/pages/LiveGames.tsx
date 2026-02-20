import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLiveGames } from "@/hooks/useLiveGames";
import { Gamepad2, Plus, Play, Trash2, Users, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import CreateLiveGameModal from "@/components/live-games/CreateLiveGameModal";
import JoinLiveGameModal from "@/components/live-games/JoinLiveGameModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";

const LiveGames = () => {
  const navigate = useNavigate();
  const { games, isLoading, deleteGame, replayGame } = useLiveGames();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

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
      <div className="min-h-screen bg-background pb-20 md:ml-64">
        {/* Sticky Header */}
        <header className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="px-4 py-3">
            {/* Top row: back + title + actions */}
            <div className="flex items-center gap-3 mb-3">
              <Button variant="ghost" size="icon" className="shrink-0 -ml-1" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
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

        <div className="px-4 py-4">
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
                          <Button
                            onClick={() => navigate(`/live-games/host/${game.id}`)}
                            className="flex-1"
                            size="sm"
                          >
                            <Play className="w-4 h-4 mr-1.5" />
                            Iniciar
                          </Button>
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
                          Ver Resultados
                        </Button>
                        <Button
                          onClick={() => handleReplayGame(game.id)}
                          size="sm"
                          className="flex-1"
                          disabled={replayGame.isPending}
                        >
                          <Play className="w-4 h-4 mr-1.5" />
                          Repetir
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
