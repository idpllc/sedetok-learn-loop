import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveGameDetails } from "@/hooks/useLiveGames";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users, Play, SkipForward, Trophy, QrCode, Copy, Check, Link, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import confetti from "canvas-confetti";
import QRCode from "react-qr-code";
import { toast } from "sonner";

const LiveGameHost = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { game, questions, players, isLoading } = useLiveGameDetails(gameId);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [answerStats, setAnswerStats] = useState<{ [key: number]: number }>({});
  const [isStarting, setIsStarting] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

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
      await supabase
        .from("live_games")
        .update({ status: 'finished', finished_at: new Date().toISOString() })
        .eq('id', gameId);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => navigate(`/live-games/results/${gameId}`), 2000);
    } else {
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
    // Force-refresh players to get latest scores before showing leaderboard
    queryClient.invalidateQueries({ queryKey: ["live-game-players", gameId] });
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

  const getOptionColors = (index: number) => {
    const colors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-yellow-500",
      "bg-green-500",
    ];
    return colors[index] || "bg-gray-500";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!game || !questions) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">Juego no encontrado</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950">

      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 bg-card/90 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0 -ml-1" onClick={() => navigate('/live-games')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight truncate">{game.title}</p>
            <p className="text-xs text-muted-foreground">
              PIN: <span className="font-mono font-bold text-primary">{game.pin}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="icon" onClick={handleCopyLink} title="Copiar link">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowQR(!showQR)} title="QR">
              <QrCode className="w-4 h-4" />
            </Button>
            <Badge variant="secondary" className="text-xs px-2 py-1 gap-1">
              <Users className="w-3 h-3" />
              {players?.length || 0}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 pb-8">

        {/* QR Drawer */}
        {showQR && (
          <Card className="p-4 mb-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="bg-white p-3 rounded-xl shadow-md shrink-0">
                <QRCode value={joinUrl} size={130} />
              </div>
              <div className="text-center sm:text-left flex-1">
                <h3 className="font-bold text-base mb-1">Escanea para unirte</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Sin necesidad de crear una cuenta
                </p>
                <code className="block text-xs bg-muted px-2 py-1.5 rounded-lg break-all text-muted-foreground mb-2">
                  {joinUrl}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copiar link
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* ── WAITING ROOM ── */}
        {game.status === 'waiting' && (
          <div className="space-y-4">
            {/* PIN card */}
            <Card className="p-5 flex flex-col items-center text-center gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                  Código PIN
                </p>
                <p className="font-mono font-black text-5xl sm:text-7xl text-primary tracking-widest">
                  {game.pin}
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl shadow-md">
                <QRCode value={joinUrl} size={120} />
              </div>

              <div className="w-full">
                <p className="text-xs text-muted-foreground mb-1.5">O comparte este link:</p>
                <div className="flex gap-2">
                  <code className="flex-1 text-xs bg-muted px-2 py-2 rounded-lg truncate text-left text-muted-foreground">
                    {joinUrl}
                  </code>
                  <Button variant="outline" size="sm" onClick={handleCopyLink} className="shrink-0">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Los jugadores pueden entrar <strong>sin crear una cuenta</strong>
              </p>
            </Card>

            {/* Players list */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Jugadores conectados
                </h2>
                <Badge variant="secondary">{players?.length || 0}</Badge>
              </div>

              {!players || players.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
                  <Users className="w-10 h-10 opacity-30" />
                  <p className="text-sm">Aún no hay jugadores...</p>
                  <p className="text-xs">Comparte el PIN o el QR</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto">
                  {players.map((player, i) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg"
                    >
                      <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}</span>
                      <span className="font-medium text-sm truncate">{player.player_name}</span>
                    </div>
                  ))}
                </div>
              )}

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

        {/* ── ACTIVE GAME ── */}
        {game.status === 'in_progress' && currentQuestion && (
          <div className="space-y-4">
            {/* Progress */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Pregunta {(game.current_question_index || 0) + 1} de {questions.length}</span>
                <span>{players?.length || 0} jugadores</span>
              </div>
              <Progress value={((game.current_question_index || 0) + 1) / questions.length * 100} />
            </div>

            {/* Question card */}
            <Card className="p-4 sm:p-6">
              <div
                className="text-xl sm:text-3xl font-bold text-center mb-5 prose prose-base sm:prose-lg max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: currentQuestion.question_text }}
              />

              {!showResults ? (
                <>
                  {currentQuestion.image_url && (
                    <div className="mb-4">
                      <img
                        src={currentQuestion.image_url}
                        alt="Pregunta"
                        className="w-full max-h-60 object-contain rounded-lg"
                      />
                    </div>
                  )}
                  {currentQuestion.video_url && (
                    <div className="mb-4">
                      <video src={currentQuestion.video_url} controls className="w-full max-h-60 rounded-lg" />
                    </div>
                  )}

                  {/* Options: 1 col on mobile, 2 cols on tablet+ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    {currentQuestion.options.map((option: any, index: number) => (
                      <div
                        key={index}
                        className={`p-4 ${getOptionColors(index)} rounded-xl text-white`}
                      >
                        {option.image_url && (
                          <img
                            src={option.image_url}
                            alt={`Opción ${index + 1}`}
                            className="w-full h-24 object-cover rounded mb-2"
                          />
                        )}
                        <p className="text-base sm:text-lg font-semibold text-center">{option.text}</p>
                      </div>
                    ))}
                  </div>

                  <Button onClick={handleShowResults} size="lg" className="w-full">
                    Mostrar Resultados
                  </Button>
                </>
              ) : (
                <>
                  {/* Answer stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {currentQuestion.options.map((option: any, index: number) => {
                      const count = answerStats[index] || 0;
                      const isCorrect = index === currentQuestion.correct_answer;
                      return (
                        <div
                          key={index}
                          className={`p-4 ${getOptionColors(index)} rounded-xl text-white ${isCorrect ? 'ring-4 ring-white/80' : ''}`}
                        >
                          {option.image_url && (
                            <img
                              src={option.image_url}
                              alt={`Opción ${index + 1}`}
                              className="w-full h-20 object-cover rounded mb-2"
                            />
                          )}
                          <p className="text-sm sm:text-lg font-semibold text-center mb-1">{option.text}</p>
                          <p className="text-2xl font-bold text-center">{count}</p>
                          {isCorrect && (
                            <p className="text-center text-sm font-bold mt-1">✓ CORRECTA</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Feedback */}
                  {currentQuestion.feedback && (
                    <Card className="p-4 mb-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                      <h3 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">
                        📚 Retroalimentación
                      </h3>
                      <div
                        className="prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: currentQuestion.feedback }}
                      />
                    </Card>
                  )}

                  {/* Top players */}
                  <Card className="p-4 mb-4">
                    <h3 className="text-base font-bold mb-3 text-center">🏆 Top 5</h3>
                    <div className="space-y-2">
                      {players?.slice(0, 5).map((player, index) => (
                        <div key={player.id} className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg font-bold w-6 text-center">{index + 1}</span>
                            <span className="font-semibold text-sm truncate">{player.player_name}</span>
                          </div>
                          <span className="text-base font-bold text-primary shrink-0 ml-2">{player.total_score}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Button onClick={handleNextQuestion} size="lg" className="w-full">
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
                </>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveGameHost;
