import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useLiveGameDetails, useSubmitAnswer } from "@/hooks/useLiveGames";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

const LiveGamePlay = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const playerId = searchParams.get("playerId");
  const { game, questions, players, isLoading } = useLiveGameDetails(gameId);
  const { submitAnswer } = useSubmitAnswer();
  
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [feedback, setFeedback] = useState<{ show: boolean; isCorrect: boolean; points: number } | null>(null);
  const [myPlayer, setMyPlayer] = useState<any>(null);

  useEffect(() => {
    if (!gameId || !playerId) return;

    // Subscribe to game updates
    const channel = supabase
      .channel(`game-player-${gameId}-${playerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_games',
          filter: `id=eq.${gameId}`,
        },
        (payload: any) => {
          console.log('Game updated:', payload);
          if (payload.new.status === 'finished') {
            // Game finished
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, playerId]);

  useEffect(() => {
    if (game && questions && questions.length > 0) {
      const idx = game.current_question_index || 0;
      const newQuestion = questions[idx];
      
      if (!currentQuestion || newQuestion.id !== currentQuestion.id) {
        setCurrentQuestion(newQuestion);
        setSelectedAnswer(null);
        setHasAnswered(false);
        setTimeLeft(newQuestion.time_limit || 20);
        setStartTime(Date.now());
        setFeedback(null);
      }
    }
  }, [game, questions]);

  useEffect(() => {
    if (players && playerId) {
      const player = players.find(p => p.id === playerId);
      setMyPlayer(player);
    }
  }, [players, playerId]);

  useEffect(() => {
    if (!currentQuestion || hasAnswered) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestion, hasAnswered]);

  const handleTimeout = () => {
    if (!hasAnswered) {
      setHasAnswered(true);
      setFeedback({ show: true, isCorrect: false, points: 0 });
    }
  };

  const handleSelectAnswer = async (answerIndex: number) => {
    if (hasAnswered || !currentQuestion || !playerId) return;

    setSelectedAnswer(answerIndex);
    setHasAnswered(true);

    const responseTime = Date.now() - startTime;

    submitAnswer.mutate(
      {
        playerId,
        questionId: currentQuestion.id,
        selectedAnswer: answerIndex,
        responseTimeMs: responseTime,
        correctAnswer: currentQuestion.correct_answer,
        maxPoints: currentQuestion.points,
        timeLimitMs: (currentQuestion.time_limit || 20) * 1000,
      },
      {
        onSuccess: (data) => {
          setFeedback({
            show: true,
            isCorrect: data.isCorrect,
            points: data.pointsEarned,
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!game || !questions || !playerId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Error al cargar el juego</p>
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

  const myRank = players?.findIndex(p => p.id === playerId) + 1 || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Waiting Room */}
        {game.status === 'waiting' && (
          <Card className="p-12 text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-6 text-primary animate-spin" />
            <h2 className="text-2xl font-bold mb-4">Esperando a que inicie el juego...</h2>
            <p className="text-muted-foreground">
              El profesor iniciará el juego pronto
            </p>
          </Card>
        )}

        {/* Game Finished */}
        {game.status === 'finished' && (
          <Card className="p-12 text-center">
            <Trophy className="w-20 h-20 mx-auto mb-6 text-yellow-500" />
            <h2 className="text-3xl font-bold mb-4">¡Juego Terminado!</h2>
            {myPlayer && (
              <>
                <p className="text-xl mb-2">Tu posición: <span className="font-bold text-primary">#{myRank}</span></p>
                <p className="text-2xl font-bold text-primary">{myPlayer.total_score} puntos</p>
              </>
            )}
          </Card>
        )}

        {/* Loading Question */}
        {game.status === 'in_progress' && !currentQuestion && (
          <Card className="p-12 text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-6 text-primary animate-spin" />
            <h2 className="text-2xl font-bold mb-4">Cargando pregunta...</h2>
          </Card>
        )}

        {/* Active Game */}
        {game.status === 'in_progress' && currentQuestion && (
          <>
            {/* Timer & Score */}
            <div className="mb-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-center flex-1">
                  <p className="text-sm text-muted-foreground">Tu Puntuación</p>
                  <p className="text-3xl font-bold text-primary">{myPlayer?.total_score || 0}</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-sm text-muted-foreground">Posición</p>
                  <p className="text-3xl font-bold">#{myRank}</p>
                </div>
              </div>

              {/* Timer */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Tiempo</span>
                  <span className="font-bold">{timeLeft}s</span>
                </div>
                <Progress value={(timeLeft / (currentQuestion.time_limit || 20)) * 100} />
              </div>
            </div>

            {/* Question */}
            <Card className="p-6 mb-6">
              <div
                className="text-2xl font-bold text-center mb-8 prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: currentQuestion.question_text }}
              />

              {/* Question Image/Video */}
              {currentQuestion.image_url && (
                <div className="mb-6">
                  <img
                    src={currentQuestion.image_url}
                    alt="Question"
                    className="w-full max-h-64 object-contain rounded-lg mx-auto"
                  />
                </div>
              )}
              {currentQuestion.video_url && (
                <div className="mb-6">
                  <video
                    src={currentQuestion.video_url}
                    controls
                    className="w-full max-h-64 rounded-lg mx-auto"
                  />
                </div>
              )}

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {currentQuestion.options.map((option: any, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Button
                        onClick={() => handleSelectAnswer(index)}
                        disabled={hasAnswered}
                        className={`w-full min-h-20 text-lg flex flex-col gap-2 p-4 ${getOptionColors(index)} text-white ${
                          selectedAnswer === index ? 'ring-4 ring-white' : ''
                        } ${hasAnswered && index === currentQuestion.correct_answer ? 'ring-4 ring-green-400' : ''}`}
                      >
                        {option.image_url && (
                          <img
                            src={option.image_url}
                            alt={`Opción ${index + 1}`}
                            className="w-full h-20 object-cover rounded"
                          />
                        )}
                        {option.text}
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Feedback after answer */}
              {feedback?.show && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`mt-6 p-6 rounded-lg text-center ${
                    feedback.isCorrect
                      ? 'bg-green-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  <p className="text-2xl font-bold mb-2">
                    {feedback.isCorrect ? '¡Correcto!' : 'Incorrecto'}
                  </p>
                  <p className="text-xl">
                    {feedback.isCorrect ? `+${feedback.points} puntos` : '0 puntos'}
                  </p>
                </motion.div>
              )}

              {/* Feedback from question */}
              {feedback?.show && currentQuestion.feedback && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4"
                >
                  <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                    <h3 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">
                      📚 Retroalimentación
                    </h3>
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert text-sm"
                      dangerouslySetInnerHTML={{ __html: currentQuestion.feedback }}
                    />
                  </Card>
                </motion.div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default LiveGamePlay;