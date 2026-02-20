import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveGameDetails } from "@/hooks/useLiveGames";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users, Play, SkipForward, Trophy, QrCode, Copy, Check, Link } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import confetti from "canvas-confetti";
import QRCode from "react-qr-code";
import { toast } from "sonner";

const LiveGameHost = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { game, questions, players, isLoading } = useLiveGameDetails(gameId);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [answerStats, setAnswerStats] = useState<{ [key: number]: number }>({});
  const [isStarting, setIsStarting] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  // Answer stats are fetched manually via fetchAnswerStats(); no duplicate channel needed here.
  // The useLiveGameDetails hook already handles all realtime updates.

  useEffect(() => {
    if (game && questions && questions.length > 0) {
      const idx = game.current_question_index || 0;
      setCurrentQuestion(questions[idx]);
    }
  }, [game, questions]);

  const fetchAnswerStats = async () => {
    if (!currentQuestion || !gameId) return;

    const { data: answers } = await supabase
      .from("live_game_answers")
      .select("selected_answer")
      .eq("question_id", currentQuestion.id);

    if (answers) {
      const stats: { [key: number]: number } = {};
      answers.forEach((a) => {
        stats[a.selected_answer] = (stats[a.selected_answer] || 0) + 1;
      });
      setAnswerStats(stats);
    }
  };

  const handleStartGame = async () => {
    if (!gameId || isStarting) return;
    
    setIsStarting(true);
    try {
      await supabase
        .from("live_games")
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', gameId);
    } finally {
      setIsStarting(false);
    }
  };

  const handleNextQuestion = async () => {
    if (!game || !questions) return;

    const nextIndex = (game.current_question_index || 0) + 1;

    if (nextIndex >= questions.length) {
      // Game finished
      await supabase
        .from("live_games")
        .update({
          status: 'finished',
          finished_at: new Date().toISOString(),
        })
        .eq('id', gameId);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setTimeout(() => {
        navigate(`/live-games/results/${gameId}`);
      }, 2000);
    } else {
      // Next question
      await supabase
        .from("live_games")
        .update({ current_question_index: nextIndex })
        .eq('id', gameId);

      setShowResults(false);
      setAnswerStats({});
    }
  };

  const handleShowResults = () => {
    fetchAnswerStats();
    setShowResults(true);
  };

  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join/${game?.pin}`
    : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success("¡Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Skeleton className="h-12 w-64 mb-8" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!game || !questions) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Juego no encontrado</p>
        </Card>
      </div>
    );
  }

  const getOptionColors = (index: number) => {
    const colors = [
      "bg-red-500 hover:bg-red-600",
      "bg-blue-500 hover:bg-blue-600",
      "bg-yellow-500 hover:bg-yellow-600",
      "bg-green-500 hover:bg-green-600",
    ];
    return colors[index] || "bg-gray-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950">
      <div className="container max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">{game.title}</h1>
            <p className="text-lg text-muted-foreground mt-1">
              PIN: <span className="font-mono font-bold text-2xl text-primary">{game.pin}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? <Check className="w-4 h-4 mr-1.5 text-green-500" /> : <Link className="w-4 h-4 mr-1.5" />}
              {copied ? "¡Copiado!" : "Copiar link"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowQR(!showQR)}>
              <QrCode className="w-4 h-4 mr-1.5" />
              {showQR ? "Ocultar QR" : "Mostrar QR"}
            </Button>
            <Badge variant="secondary" className="text-base px-3 py-1.5">
              <Users className="w-4 h-4 mr-2" />
              {players?.length || 0} jugadores
            </Badge>
          </div>
        </div>

        {/* QR Panel */}
        {showQR && (
          <Card className="p-6 mb-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="bg-white p-4 rounded-xl shadow-md flex-shrink-0">
                <QRCode value={joinUrl} size={160} />
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-xl font-bold mb-2">Escanea para unirte</h3>
                <p className="text-muted-foreground mb-3 text-sm">
                  Los jugadores pueden escanear este código QR con la cámara de su teléfono para unirse directamente, sin necesidad de crear una cuenta.
                </p>
                <div className="font-mono text-sm bg-muted px-3 py-2 rounded-lg break-all text-muted-foreground">
                  {joinUrl}
                </div>
                <Button variant="outline" size="sm" className="mt-3" onClick={handleCopyLink}>
                  <Copy className="w-4 h-4 mr-1.5" />
                  Copiar link
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Waiting Room */}
        {game.status === 'waiting' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Panel izquierdo: PIN + QR */}
            <Card className="p-8 flex flex-col items-center text-center gap-5">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-1">
                  Código PIN
                </p>
                <p className="font-mono font-black text-6xl text-primary tracking-widest">
                  {game.pin}
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl shadow-md">
                <QRCode value={joinUrl} size={140} />
              </div>

              <div className="w-full">
                <p className="text-xs text-muted-foreground mb-2">O comparte este link:</p>
                <div className="flex gap-2">
                  <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg truncate text-left">
                    {joinUrl}
                  </code>
                  <Button variant="outline" size="sm" onClick={handleCopyLink} className="flex-shrink-0">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Los jugadores pueden entrar <strong>sin crear una cuenta</strong>
              </p>
            </Card>

            {/* Panel derecho: jugadores */}
            <Card className="p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Jugadores conectados
                </h2>
                <Badge variant="secondary" className="text-base px-3">
                  {players?.length || 0}
                </Badge>
              </div>

              <div className="flex-1 min-h-[200px]">
                {!players || players.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                    <Users className="w-12 h-12 opacity-30" />
                    <p className="text-sm">Aún no hay jugadores...</p>
                    <p className="text-xs">Comparte el PIN o el QR</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-64">
                    {players.map((player, i) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg"
                      >
                        <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                        <span className="font-medium text-sm truncate">{player.player_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleStartGame}
                size="lg"
                disabled={!players || players.length === 0 || isStarting}
                className="mt-4 w-full"
              >
                <Play className="w-5 h-5 mr-2" />
                {isStarting ? "Iniciando..." : `Iniciar Juego${players?.length ? ` (${players.length})` : ''}`}
              </Button>
            </Card>
          </div>
        )}

        {/* Active Game */}
        {game.status === 'in_progress' && currentQuestion && (
          <>
            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Pregunta {(game.current_question_index || 0) + 1} de {questions.length}</span>
              </div>
              <Progress value={((game.current_question_index || 0) + 1) / questions.length * 100} />
            </div>

            {/* Question */}
            <Card className="p-8 mb-6">
              <div
                className="text-3xl font-bold text-center mb-8 prose prose-lg max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: currentQuestion.question_text }}
              />

              {!showResults ? (
                <>
                  {/* Question Image/Video */}
                  {currentQuestion.image_url && (
                    <div className="mb-6">
                      <img
                        src={currentQuestion.image_url}
                        alt="Question"
                        className="w-full max-h-96 object-contain rounded-lg"
                      />
                    </div>
                  )}
                  {currentQuestion.video_url && (
                    <div className="mb-6">
                      <video
                        src={currentQuestion.video_url}
                        controls
                        className="w-full max-h-96 rounded-lg"
                      />
                    </div>
                  )}

                  {/* Options */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {currentQuestion.options.map((option: any, index: number) => (
                      <Card
                        key={index}
                        className={`p-6 ${getOptionColors(index)} text-white cursor-default`}
                      >
                        {option.image_url && (
                          <img
                            src={option.image_url}
                            alt={`Opción ${index + 1}`}
                            className="w-full h-32 object-cover rounded mb-3"
                          />
                        )}
                        <p className="text-xl font-semibold text-center">{option.text}</p>
                      </Card>
                    ))}
                  </div>

                  <div className="text-center">
                    <Button onClick={handleShowResults} size="lg">
                      Mostrar Resultados
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Answer Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {currentQuestion.options.map((option: any, index: number) => {
                      const count = answerStats[index] || 0;
                      const isCorrect = index === currentQuestion.correct_answer;
                      
                      return (
                        <Card
                          key={index}
                          className={`p-6 ${getOptionColors(index)} text-white ${isCorrect ? 'ring-4 ring-green-400' : ''}`}
                        >
                          {option.image_url && (
                            <img
                              src={option.image_url}
                              alt={`Opción ${index + 1}`}
                              className="w-full h-32 object-cover rounded mb-3"
                            />
                          )}
                          <p className="text-xl font-semibold text-center mb-2">
                            {option.text}
                          </p>
                          <p className="text-3xl font-bold text-center">
                            {count} respuestas
                          </p>
                          {isCorrect && (
                            <p className="text-center mt-2 font-bold">✓ CORRECTA</p>
                          )}
                        </Card>
                      );
                    })}
                  </div>

                  {/* Feedback */}
                  {currentQuestion.feedback && (
                    <Card className="p-6 mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                      <h3 className="text-lg font-semibold mb-3 text-blue-900 dark:text-blue-100">
                        📚 Retroalimentación
                      </h3>
                      <div
                        className="prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: currentQuestion.feedback }}
                      />
                    </Card>
                  )}

                  {/* Top Players */}
                  <Card className="p-6 mb-6">
                    <h3 className="text-xl font-bold mb-4 text-center">Top 5</h3>
                    <div className="space-y-2">
                      {players?.slice(0, 5).map((player, index) => (
                        <div key={player.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold">{index + 1}</span>
                            <span className="font-semibold">{player.player_name}</span>
                          </div>
                          <span className="text-xl font-bold text-primary">{player.total_score}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <div className="text-center">
                    <Button onClick={handleNextQuestion} size="lg">
                      {(game.current_question_index || 0) + 1 >= questions.length ? (
                        <>
                          <Trophy className="w-5 h-5 mr-2" />
                          Ver Podio Final
                        </>
                      ) : (
                        <>
                          <SkipForward className="w-5 h-5 mr-2" />
                          Siguiente Pregunta
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default LiveGameHost;