import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { useEvaluationEvents } from "@/hooks/useEvaluationEvents";
import { useAuth } from "@/hooks/useAuth";
import { useGameAttempts } from "@/hooks/useGameAttempts";
import { GameViewer } from "@/components/GameViewer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";

const GameEvaluation = () => {
  const { accessCode } = useParams<{ accessCode: string }>();
  const [searchParams] = useSearchParams();
  const codeFromQuery = searchParams.get("code");
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { getEventByAccessCode } = useEvaluationEvents();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [startGame, setStartGame] = useState(false);

  const { hasAttempted, attemptCount, isLoading: attemptsLoading } = useGameAttempts(
    event?.game_id,
    event?.id
  );

  useEffect(() => {
    const loadEvent = async () => {
      const code = accessCode || codeFromQuery;
      if (!code) {
        setLoading(false);
        return;
      }

      try {
        const eventData = await getEventByAccessCode(code);
        setEvent(eventData);
        setError(null);
      } catch (err: any) {
        console.error("Error loading event:", err);
        setError(err.message || "Evento no encontrado");
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [accessCode, codeFromQuery]);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const eventData = await getEventByAccessCode(codeInput.trim());
      setEvent(eventData);
      navigate(`/game-evaluation/${codeInput.trim().toUpperCase()}`);
    } catch (err: any) {
      console.error("Error loading event:", err);
      setError(err.message || "Evento no encontrado");
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = () => {
    if (event.require_authentication && !user) {
      navigate("/auth", { state: { returnTo: window.location.pathname } });
      return;
    }

    setStartGame(true);
  };

  const canAttempt = () => {
    if (!event) return false;
    if (!event.allow_multiple_attempts && hasAttempted) return false;
    return true;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando evento...</p>
        </div>
      </div>
    );
  }

  // Show code input form if no event loaded
  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Ingresar Código de Evaluación</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="Ingresa el código"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  className="text-center font-mono text-lg"
                  maxLength={6}
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={!codeInput.trim()}>
                Continuar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if event is active
  const now = new Date();
  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const isActive = now >= startDate && now <= endDate;
  const hasEnded = now > endDate;
  const notStarted = now < startDate;

  // If user is playing the game
  if (startGame) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-16">
        <GameViewer
          gameId={event.game_id}
          evaluationEventId={event.id}
          showResultsImmediately={event.show_results_immediately}
          onComplete={() => setStartGame(false)}
        />
      </div>
    );
  }

  // Show event information
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6 pt-8">
        <Card>
          <CardHeader>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {isActive && <CheckCircle className="h-5 w-5 text-green-500" />}
                {hasEnded && <AlertCircle className="h-5 w-5 text-destructive" />}
                {notStarted && <Clock className="h-5 w-5 text-yellow-500" />}
                <span className="text-sm font-medium">
                  {isActive && "Evaluación Activa"}
                  {hasEnded && "Evaluación Finalizada"}
                  {notStarted && "Evaluación Programada"}
                </span>
              </div>
              <CardTitle className="text-2xl">{event.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {event.description && (
              <p className="text-muted-foreground">{event.description}</p>
            )}

            <div className="grid gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Inicio:</span>
                <span>{format(startDate, "PPP 'a las' p", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Fin:</span>
                <span>{format(endDate, "PPP 'a las' p", { locale: es })}</span>
              </div>
            </div>

            {!attemptsLoading && hasAttempted && !event.allow_multiple_attempts && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Ya has completado esta evaluación ({attemptCount} intento{attemptCount > 1 ? 's' : ''})
                </AlertDescription>
              </Alert>
            )}

            {hasEnded && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Esta evaluación ha finalizado
                </AlertDescription>
              </Alert>
            )}

            {notStarted && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Esta evaluación comenzará el {format(startDate, "PPP 'a las' p", { locale: es })}
                </AlertDescription>
              </Alert>
            )}

            {event.require_authentication && !user && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Debes iniciar sesión para participar en esta evaluación
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Button
                onClick={handleStartGame}
                disabled={!isActive || (!canAttempt() && !event.allow_multiple_attempts)}
                className="w-full"
                size="lg"
              >
                {!isActive ? "No Disponible" : !canAttempt() ? "Ya Completado" : "Comenzar Juego"}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="w-full"
              >
                Volver al Inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GameEvaluation;
