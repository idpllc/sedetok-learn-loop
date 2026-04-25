import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, AlertCircle, CheckCircle, Home, ArrowLeft, History, KeyRound, Eye } from "lucide-react";
import { useEvaluationEvents } from "@/hooks/useEvaluationEvents";
import { useAuth } from "@/hooks/useAuth";
import { useEventAttempts } from "@/hooks/useEventAttempts";
import { QuizViewer } from "@/components/QuizViewer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const QuizEvaluation = () => {
  const { accessCode } = useParams<{ accessCode: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { getEventByAccessCode } = useEvaluationEvents();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [startQuiz, setStartQuiz] = useState(false);
  const { hasAttempted, attemptCount, lastAttempt, isLoading: attemptsLoading } = useEventAttempts(event?.id);

  // Fetch user's quiz result history
  const { data: quizHistory } = useQuery({
    queryKey: ["quiz-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_quiz_results")
        .select(`
          *,
          quizzes:quiz_id (title),
          evaluation_events:evaluation_event_id (title, access_code)
        `)
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !accessCode,
  });

  useEffect(() => {
    // Only (re)load when the access code or auth-loading state changes.
    // We intentionally exclude `user` from deps: once the event is loaded and
    // the quiz has started, a refreshed `user` reference (e.g. token refresh)
    // would otherwise re-trigger loadEvent → toggle `loading` → unmount
    // <QuizViewer/>, causing the quiz to reset back to the start screen.
    if (accessCode && !authLoading) {
      if (!event) {
        loadEvent(accessCode);
      }
    } else if (!accessCode) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessCode, authLoading]);

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
        setError("El evento de evaluación ya se ha cerrado");
      } else if (eventData.require_authentication && !user) {
        // Redirigir al login con la URL actual para volver después
        navigate("/auth", { 
          state: { from: `/quiz-evaluation/${code}` },
          replace: true 
        });
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

  if (loading || authLoading) {
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
      <div className="min-h-screen p-4 pb-24">
        <div className="container mx-auto max-w-2xl space-y-6">
          {/* Header with navigation */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <Home className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Evaluaciones</h1>
              <p className="text-sm text-muted-foreground">
                Historial y acceso a eventos evaluativos
              </p>
            </div>
          </div>

          <Tabs defaultValue="history" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                Historial
              </TabsTrigger>
              <TabsTrigger value="join" className="gap-2">
                <KeyRound className="h-4 w-4" />
                Unirse
              </TabsTrigger>
            </TabsList>

            {/* History Tab */}
            <TabsContent value="history" className="mt-4 space-y-3">
              {!user ? (
                <Card className="p-6 text-center space-y-3">
                  <p className="text-muted-foreground">Inicia sesión para ver tu historial</p>
                  <Button onClick={() => navigate("/auth")}>Iniciar Sesión</Button>
                </Card>
              ) : quizHistory && quizHistory.length > 0 ? (
                quizHistory.map((result: any) => (
                  <Card key={result.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {(result as any).evaluation_events?.title || (result as any).quizzes?.title || "Quiz"}
                        </h3>
                        {(result as any).evaluation_events?.access_code && (
                          <p className="text-xs text-muted-foreground font-mono">
                            Código: {(result as any).evaluation_events.access_code}
                          </p>
                        )}
                      </div>
                      <Badge variant={result.passed ? "default" : "destructive"}>
                        {result.passed ? "Aprobado" : "No aprobado"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {result.completed_at
                          ? format(new Date(result.completed_at), "dd MMM yyyy, HH:mm", { locale: es })
                          : "—"}
                      </span>
                      <span className="font-bold">
                        {result.score} / {result.max_score}
                      </span>
                    </div>
                    {result.answers && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => {
                          if (result.evaluation_event_id) {
                            navigate(`/quiz-evaluations/results/${result.evaluation_event_id}`);
                          }
                        }}
                      >
                        <Eye className="h-3 w-3" />
                        Ver respuestas
                      </Button>
                    )}
                  </Card>
                ))
              ) : (
                <Card className="p-8 text-center">
                  <History className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Aún no has respondido ningún quiz</p>
                </Card>
              )}
            </TabsContent>

            {/* Join Tab */}
            <TabsContent value="join" className="mt-4">
              <Card className="p-6 space-y-4">
                <div className="text-center space-y-2">
                  <KeyRound className="h-10 w-10 mx-auto text-primary" />
                  <h2 className="text-lg font-semibold">Unirse a un Evento</h2>
                  <p className="text-sm text-muted-foreground">
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
            </TabsContent>
          </Tabs>
        </div>
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
        </Card>
      </div>
    );
  }

  if (!startQuiz && event) {
    // Verificar si el usuario ya completó este evento
    if (user && !attemptsLoading && hasAttempted && !event.allow_multiple_attempts) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold">{event.title}</h1>
              <p className="text-muted-foreground">Ya has completado esta evaluación</p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Completaste este evento el {format(new Date(lastAttempt.completed_at), "dd MMMM yyyy 'a las' HH:mm", { locale: es })}.
                {!event.allow_multiple_attempts && " Este evento no permite múltiples intentos."}
              </AlertDescription>
            </Alert>

            {lastAttempt && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <h3 className="font-semibold mb-2">Tu resultado:</h3>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Puntuación:</span>
                  <span className="text-2xl font-bold">{lastAttempt.score} / {lastAttempt.max_score}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-muted-foreground">Estado:</span>
                  <span className={lastAttempt.passed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    {lastAttempt.passed ? "Aprobado" : "No aprobado"}
                  </span>
                </div>
              </div>
            )}

            <Button onClick={() => navigate("/quiz-evaluation")} className="w-full">
              Volver
            </Button>
          </Card>
        </div>
      );
    }

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

          {user && hasAttempted && event.allow_multiple_attempts && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Ya has realizado este quiz {attemptCount} {attemptCount === 1 ? 'vez' : 'veces'}. 
                Puedes tomarlo nuevamente.
              </AlertDescription>
            </Alert>
          )}

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
          onComplete={() => navigate("/quiz-evaluation")}
        />
      </div>
    );
  }

  return null;
};

export default QuizEvaluation;
