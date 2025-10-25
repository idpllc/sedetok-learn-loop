import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditGameForm } from "@/components/EditGameForm";
import { CreateGameEvaluationEvent } from "@/components/game/CreateGameEvaluationEvent";
import { GameEvaluationEventsList } from "@/components/game/GameEvaluationEventsList";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EditGame = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: location.pathname } });
    }
  }, [user, authLoading, navigate, location]);

  useEffect(() => {
    const fetchGame = async () => {
      if (!id) return;
      
      try {
        const { data: gameData, error } = await supabase
          .from("games")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        
        if (!gameData) {
          toast.error("Juego no encontrado");
          navigate("/profile");
          return;
        }

        // Check if user is the creator
        if (gameData.creator_id !== user?.id) {
          toast.error("No tienes permiso para editar este juego");
          navigate("/profile");
          return;
        }

        setGame(gameData);
      } catch (error) {
        console.error("Error fetching game:", error);
        toast.error("Error al cargar el juego");
        navigate("/profile");
      } finally {
        setLoading(false);
      }
    };

    if (user && id) {
      fetchGame();
    }
  }, [id, user, navigate]);

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center pt-20 md:pt-0">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!game) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-20 md:pt-0">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Editar Juego</h1>
        </div>
      </header>

      <main className="w-full px-4 py-6 max-w-6xl mx-auto">
        <Tabs defaultValue="edit" className="space-y-6">
          <TabsList>
            <TabsTrigger value="edit">Editar Juego</TabsTrigger>
            <TabsTrigger value="events">Eventos de Evaluación</TabsTrigger>
          </TabsList>

          <TabsContent value="edit">
            <EditGameForm gameData={game} />
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Eventos de Evaluación</h2>
                <p className="text-muted-foreground text-sm">
                  Crea eventos para que los estudiantes jueguen este juego en períodos específicos
                </p>
              </div>
              <CreateGameEvaluationEvent 
                gameId={id!} 
                gameTitle={game.title} 
              />
            </div>
            <GameEvaluationEventsList gameId={id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default EditGame;
