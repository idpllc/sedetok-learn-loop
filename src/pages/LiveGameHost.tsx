import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveGameDetails } from "@/hooks/useLiveGames";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users, Play, SkipForward, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import confetti from "canvas-confetti";

const LiveGameHost = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { game, questions, players, isLoading } = useLiveGameDetails(gameId);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [answerStats, setAnswerStats] = useState<{ [key: number]: number }>({});
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!gameId) return;

    // Subscribe to game updates
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          console.log('Game updated:', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_game_answers',
        },
        () => {
          // Refetch answer stats
          if (currentQuestion) {
            fetchAnswerStats();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, currentQuestion]);

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{game.title}</h1>
            <p className="text-lg text-muted-foreground mt-1">PIN: <span className="font-mono font-bold text-2xl text-primary">{game.pin}</span></p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Users className="w-5 h-5 mr-2" />
              {players?.length || 0} jugadores
            </Badge>
          </div>
        </div>

        {/* Waiting Room */}
        {game.status === 'waiting' && (
          <Card className="p-12 text-center">
            <Users className="w-20 h-20 mx-auto mb-6 text-primary" />
            <h2 className="text-2xl font-bold mb-4">Esperando jugadores...</h2>
            <p className="text-muted-foreground mb-8">
              {players?.length || 0} jugador(es) conectado(s)
            </p>

            {players && players.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {players.map((player) => (
                  <Card key={player.id} className="p-4">
                    <p className="font-semibold">{player.player_name}</p>
                  </Card>
                ))}
              </div>
            )}

            <Button
              onClick={handleStartGame}
              size="lg"
              disabled={!players || players.length === 0 || isStarting}
            >
              <Play className="w-5 h-5 mr-2" />
              {isStarting ? "Iniciando..." : "Iniciar Juego"}
            </Button>
          </Card>
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
              <h2 className="text-3xl font-bold text-center mb-8">
                {currentQuestion.question_text}
              </h2>

              {!showResults ? (
                <>
                  {/* Options */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {currentQuestion.options.map((option: any, index: number) => (
                      <Card
                        key={index}
                        className={`p-6 ${getOptionColors(index)} text-white cursor-default`}
                      >
                        <p className="text-xl font-semibold text-center">
                          {option.text}
                        </p>
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