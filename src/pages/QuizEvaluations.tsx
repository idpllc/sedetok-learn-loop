import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, ArrowLeft, Copy, Share2, CheckCircle } from "lucide-react";
import { CreateUnifiedEvaluationEvent } from "@/components/CreateUnifiedEvaluationEvent";
import { EvaluationEventsList } from "@/components/quiz/EvaluationEventsList";
import { GameEvaluationEventsList } from "@/components/game/GameEvaluationEventsList";
import { EventResults } from "@/components/quiz/EventResults";
import { useAuth } from "@/hooks/useAuth";
import { useEvaluationEvents } from "@/hooks/useEvaluationEvents";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const QuizEvaluations = () => {
  const { quizId, gameId, eventId } = useParams<{ quizId?: string; gameId?: string; eventId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { eventResults, resultsLoading } = useEvaluationEvents(undefined, undefined, undefined, eventId);

  const createQuizId = searchParams.get("createQuizId");
  const createGameId = searchParams.get("createGameId");

  // Auto-open modal when navigating with createQuizId or createGameId
  useEffect(() => {
    if (createQuizId || createGameId) {
      setShowCreateModal(true);
    }
  }, [createQuizId, createGameId]);

  // Fetch event details when viewing an event
  const { data: eventDetails } = useQuery({
    queryKey: ["event-details", eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await supabase
        .from("quiz_evaluation_events")
        .select("*, quizzes(title), games(title)")
        .eq("id", eventId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  if (!user) {
    navigate("/auth", { replace: true });
    return null;
  }

  const handleCopyCode = () => {
    if (eventDetails?.access_code) {
      navigator.clipboard.writeText(eventDetails.access_code);
      toast({ title: "Código copiado", description: "El código de acceso ha sido copiado al portapapeles" });
    }
  };

  const handleShareEvent = () => {
    if (eventDetails?.access_code) {
      const shareUrl = `${window.location.origin}/quiz-evaluation/${eventDetails.access_code}`;
      const shareText = `📝 Evento Evaluativo: ${eventDetails.title}\n\n🔑 Código de acceso: ${eventDetails.access_code}\n🔗 Enlace directo: ${shareUrl}\n\nIngresa a SEDEFY y usa el código para unirte.`;
      
      if (navigator.share) {
        navigator.share({ title: eventDetails.title, text: shareText, url: shareUrl });
      } else {
        navigator.clipboard.writeText(shareText);
        toast({ title: "Enlace copiado", description: "La información del evento ha sido copiada al portapapeles" });
      }
    }
  };

  // Mostrar resultados si hay eventId
  if (eventId) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-full">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{eventDetails?.title || "Resultados del Evento"}</h1>
              <p className="text-muted-foreground">
                {eventDetails?.quizzes?.title || eventDetails?.games?.title || "Visualiza las calificaciones de todos los participantes"}
              </p>
            </div>
          </div>

          {/* Sharing banner */}
          {eventDetails && (
            <Alert className="bg-primary/5 border-primary/20">
              <CheckCircle className="h-5 w-5 text-primary" />
              <AlertDescription className="ml-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">Evento evaluativo creado</p>
                    <p className="text-sm text-muted-foreground">
                      Comparte el código de acceso con tus estudiantes para que se unan y respondan.
                    </p>
                    <p className="text-lg font-mono font-bold text-primary mt-1">{eventDetails.access_code}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyCode} className="gap-1">
                      <Copy className="h-4 w-4" />
                      Copiar código
                    </Button>
                    <Button size="sm" onClick={handleShareEvent} className="gap-1">
                      <Share2 className="h-4 w-4" />
                      Compartir
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <EventResults
            results={eventResults?.results || []}
            eventTitle={eventDetails?.title || "Evento de Evaluación"}
            loading={resultsLoading}
            eventId={eventId}
            quizId={eventResults?.quiz_id || undefined}
            gameId={eventResults?.game_id || undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
            <div className="flex-1 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Eventos de Evaluación</h1>
              <p className="text-muted-foreground">
                Gestiona los eventos de evaluación con tus quizzes y juegos
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Evento
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="finished">Finalizados</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            <div className="space-y-4">
              {quizId && <EvaluationEventsList quizId={quizId} status="all" />}
              {gameId && <GameEvaluationEventsList gameId={gameId} status="all" />}
              {!quizId && !gameId && (
                <>
                  <EvaluationEventsList status="all" />
                  <GameEvaluationEventsList status="all" />
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="active" className="mt-6">
            <div className="space-y-4">
              {quizId && <EvaluationEventsList quizId={quizId} status="active" />}
              {gameId && <GameEvaluationEventsList gameId={gameId} status="active" />}
              {!quizId && !gameId && (
                <>
                  <EvaluationEventsList status="active" />
                  <GameEvaluationEventsList status="active" />
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="finished" className="mt-6">
            <div className="space-y-4">
              {quizId && <EvaluationEventsList quizId={quizId} status="finished" />}
              {gameId && <GameEvaluationEventsList gameId={gameId} status="finished" />}
              {!quizId && !gameId && (
                <>
                  <EvaluationEventsList status="finished" />
                  <GameEvaluationEventsList status="finished" />
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <CreateUnifiedEvaluationEvent
          quizId={createQuizId || quizId}
          gameId={createGameId || gameId}
          open={showCreateModal}
          onOpenChange={(open) => {
            setShowCreateModal(open);
            if (!open && (createQuizId || createGameId)) {
              setSearchParams({});
            }
          }}
        />
      </div>
    </div>
  );
};

export default QuizEvaluations;
