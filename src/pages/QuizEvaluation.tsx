import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { useEvaluationEvents } from "@/hooks/useEvaluationEvents";
import { useAuth } from "@/hooks/useAuth";
import { QuizViewer } from "@/components/QuizViewer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";

const QuizEvaluation = () => {
  const { accessCode } = useParams<{ accessCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getEventByAccessCode } = useEvaluationEvents();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [startQuiz, setStartQuiz] = useState(false);

  useEffect(() => {
    if (accessCode) {
      loadEvent(accessCode);
    } else {
      setLoading(false);
    }
  }, [accessCode]);

  const loadEvent = async (code: string) => {
    try {
      setLoading(true);
      setError(null);
      const eventData = await getEventByAccessCode(code);
      
      // Verificar fechas
      const now = new Date();
      const start = new Date(eventData.start_date);
      const end = new Date(eventData.end_date);

      if (now < start) {
        setError("Este evento aún no ha comenzado");
      } else if (now > end) {
        setError("Este evento ha finalizado");
      } else if (eventData.require_authentication && !user) {
        setError("Debes iniciar sesión para realizar esta evaluación");
      } else {
        setEvent(eventData);
      }
    } catch (err: any) {
      setError("Código de acceso inválido o evento no encontrado");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (codeInput.trim()) {
      navigate(`/quiz-evaluation/${codeInput.trim().toUpperCase()}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando evento...</p>
        </div>
      </div>
    );
  }

  if (!accessCode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Evento de Evaluación</h1>
            <p className="text-muted-foreground">
              Ingresa el código de acceso proporcionado por tu profesor
            </p>
          </div>

          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <Label htmlFor="code">Código de Acceso</Label>
              <Input
                id="code"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="Ej: ABC12345"
                className="font-mono text-center text-lg"
                maxLength={8}
              />
            </div>
            <Button type="submit" className="w-full">
              Acceder
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>

          <Button onClick={() => navigate("/quiz-evaluation")} className="w-full">
            Intentar con otro código
          </Button>

          {error === "Debes iniciar sesión para realizar esta evaluación" && (
            <Button onClick={() => navigate("/auth")} variant="outline" className="w-full">
              Iniciar Sesión
            </Button>
          )}
        </Card>
      </div>
    );
  }

  if (!startQuiz && event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl p-6 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">{event.title}</h1>
            {event.description && (
              <p className="text-muted-foreground">{event.description}</p>
            )}
          </div>

          <div className="space-y-3 border-t border-b py-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                Inicio: {format(new Date(event.start_date), "dd MMMM yyyy, HH:mm", { locale: es })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                Finaliza: {format(new Date(event.end_date), "dd MMMM yyyy, HH:mm", { locale: es })}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Quiz: {event.quizzes?.title}</h3>
            {event.quizzes?.description && (
              <p className="text-sm text-muted-foreground">{event.quizzes.description}</p>
            )}
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {event.allow_multiple_attempts
                ? "Puedes realizar este quiz múltiples veces durante el período activo."
                : "Solo tendrás una oportunidad para realizar este quiz."}
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={() => navigate("/quiz-evaluation")} variant="outline" className="flex-1">
              Cancelar
            </Button>
            <Button onClick={() => setStartQuiz(true)} className="flex-1">
              Comenzar Quiz
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (startQuiz && event) {
    return (
      <div className="container mx-auto py-8">
        <QuizViewer 
          quizId={event.quiz_id} 
          evaluationEventId={event.id}
          showResultsImmediately={event.show_results_immediately}
        />
      </div>
    );
  }

  return null;
};

export default QuizEvaluation;
