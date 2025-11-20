import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLiveGames } from "@/hooks/useLiveGames";
import { Gamepad2, Plus, Play, Trash2, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import CreateLiveGameModal from "@/components/live-games/CreateLiveGameModal";
import JoinLiveGameModal from "@/components/live-games/JoinLiveGameModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const LiveGames = () => {
  const navigate = useNavigate();
  const { games, isLoading, deleteGame } = useLiveGames();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="secondary">En Espera</Badge>;
      case 'in_progress':
        return <Badge className="bg-green-500">En Progreso</Badge>;
      case 'finished':
        return <Badge variant="outline">Finalizado</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Juegos en Vivo
          </h1>
          <p className="text-muted-foreground mt-2">
            Crea y juega en tiempo real tipo Kahoot
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setShowJoinModal(true)} variant="outline">
            <Gamepad2 className="w-4 h-4 mr-2" />
            Unirme a un Juego
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Juego
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my-games" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="my-games">Mis Juegos</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="my-games" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </Card>
              ))}
            </div>
          ) : games && games.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.filter(g => g.status !== 'finished').map((game) => (
                <Card key={game.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{game.title}</h3>
                      {getStatusBadge(game.status)}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">PIN:</span>
                      <span className="font-mono font-bold text-lg text-primary">{game.pin}</span>
                    </div>
                    {game.subject && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Materia:</span>
                        <span>{game.subject}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {game.status === 'waiting' && (
                      <Button
                        onClick={() => navigate(`/live-games/host/${game.id}`)}
                        className="flex-1"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Iniciar
                      </Button>
                    )}
                    {game.status === 'in_progress' && (
                      <Button
                        onClick={() => navigate(`/live-games/host/${game.id}`)}
                        className="flex-1"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Ver Juego
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
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
                          <AlertDialogAction
                            onClick={() => deleteGame.mutate(game.id)}
                          >
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
            <Card className="p-12 text-center">
              <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No tienes juegos creados</h3>
              <p className="text-muted-foreground mb-6">
                Crea tu primer juego en vivo y empieza a competir con tus estudiantes
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Juego
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                </Card>
              ))}
            </div>
          ) : games && games.filter(g => g.status === 'finished').length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.filter(g => g.status === 'finished').map((game) => (
                <Card key={game.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{game.title}</h3>
                      {getStatusBadge(game.status)}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Finalizado:</span>
                      <span>{new Date(game.finished_at!).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => navigate(`/live-games/results/${game.id}`)}
                    variant="outline"
                    className="w-full"
                  >
                    Ver Resultados
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No hay juegos finalizados</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateLiveGameModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
      <JoinLiveGameModal
        open={showJoinModal}
        onOpenChange={setShowJoinModal}
      />
    </div>
  );
};

export default LiveGames;