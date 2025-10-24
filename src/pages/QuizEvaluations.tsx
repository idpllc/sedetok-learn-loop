import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, ArrowLeft } from "lucide-react";
import { CreateEvaluationEvent } from "@/components/quiz/CreateEvaluationEvent";
import { EvaluationEventsList } from "@/components/quiz/EvaluationEventsList";
import { EventResults } from "@/components/quiz/EventResults";
import { useAuth } from "@/hooks/useAuth";
import { useEvaluationEvents } from "@/hooks/useEvaluationEvents";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const QuizEvaluations = () => {
  const { quizId, eventId } = useParams<{ quizId?: string; eventId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { eventResults, resultsLoading } = useEvaluationEvents(undefined, eventId);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <p className="text-muted-foreground">Debes iniciar sesión para gestionar evaluaciones</p>
        </Card>
      </div>
    );
  }

  // Mostrar resultados si hay eventId
  if (eventId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Resultados del Evento</h1>
              <p className="text-muted-foreground">
                Visualiza las calificaciones de todos los participantes
              </p>
            </div>
          </div>

          <EventResults
            results={eventResults || []}
            eventTitle="Evento de Evaluación"
            loading={resultsLoading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Eventos de Evaluación</h1>
            <p className="text-muted-foreground">
              Gestiona los eventos de evaluación con tus quizzes
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Evento
          </Button>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="finished">Finalizados</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            <EvaluationEventsList quizId={quizId} />
          </TabsContent>
          
          <TabsContent value="active" className="mt-6">
            <EvaluationEventsList quizId={quizId} />
          </TabsContent>
          
          <TabsContent value="finished" className="mt-6">
            <EvaluationEventsList quizId={quizId} />
          </TabsContent>
        </Tabs>

        {quizId && (
          <CreateEvaluationEvent
            quizId={quizId}
            open={showCreateModal}
            onOpenChange={setShowCreateModal}
          />
        )}
      </div>
    </div>
  );
};

export default QuizEvaluations;
