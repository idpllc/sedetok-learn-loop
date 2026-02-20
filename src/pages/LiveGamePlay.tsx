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
    const channel = supabase
      .channel(`game-player-${gameId}-${playerId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_games', filter: `id=eq.${gameId}` },
        (payload: any) => { console.log('Game updated:', payload); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
        if (prev <= 1) { clearInterval(timer); handleTimeout(); return 0; }
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
      { playerId, questionId: currentQuestion.id, selectedAnswer: answerIndex, responseTimeMs: responseTime, correctAnswer: currentQuestion.correct_answer, maxPoints: currentQuestion.points, timeLimitMs: (currentQuestion.time_limit || 20) * 1000 },
      { onSuccess: (data) => { setFeedback({ show: true, isCorrect: data.isCorrect, points: data.pointsEarned }); } }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!game || !questions || !playerId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center w-full max-w-sm">
          <p className="text-muted-foreground">Error al cargar el juego</p>
        </Card>
      </div>
    );
  }

  const getOptionColors = (index: number) => {
    const colors = ["bg-red-500 active:bg-red-600", "bg-blue-500 active:bg-blue-600", "bg-yellow-500 active:bg-yellow-600", "bg-green-500 active:bg-green-600"];
    return colors[index] || "bg-gray-500";
  };

  const myRank = players?.findIndex(p => p.id === playerId) + 1 || 0;
  const timePercent = (timeLeft / (currentQuestion?.time_limit || 20)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950 flex flex-col">

      {/* ── WAITING ROOM ── */}
      {game.status === 'waiting' && (
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="p-8 text-center w-full max-w-sm">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
            <h2 className="text-xl font-bold mb-2">Esperando inicio...</h2>
            <p className="text-sm text-muted-foreground">El profesor iniciará el juego pronto</p>
          </Card>
        </div>
      )}

      {/* ── FINISHED ── */}
      {game.status === 'finished' && (
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="p-8 text-center w-full max-w-sm">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-2xl font-bold mb-3">¡Juego Terminado!</h2>
            {myPlayer && (
              <div className="space-y-1">
                <p className="text-base text-muted-foreground">Tu posición</p>
                <p className="text-4xl font-black text-primary">#{myRank}</p>
                <p className="text-2xl font-bold mt-2">{myPlayer.total_score} <span className="text-sm font-normal text-muted-foreground">puntos</span></p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── LOADING QUESTION ── */}
      {game.status === 'in_progress' && !currentQuestion && (
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="p-8 text-center w-full max-w-sm">
            <Loader2 className="w-10 h-10 mx-auto mb-3 text-primary animate-spin" />
            <p className="font-semibold">Cargando pregunta...</p>
          </Card>
        </div>
      )}

      {/* ── ACTIVE GAME ── */}
      {game.status === 'in_progress' && currentQuestion && (
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-3 py-3 gap-3">

          {/* Score + timer bar — sticky mini header */}
          <div className="bg-card/90 backdrop-blur rounded-2xl px-4 py-2.5 shadow-sm flex items-center gap-4">
            <div className="text-center flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Puntos</p>
              <p className="text-xl font-black text-primary leading-none">{myPlayer?.total_score || 0}</p>
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Tiempo</span>
                <span className={`font-bold tabular-nums ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : ''}`}>{timeLeft}s</span>
              </div>
              <Progress value={timePercent} className={`h-2 ${timeLeft <= 5 ? '[&>div]:bg-red-500' : ''}`} />
            </div>
            <div className="text-center flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Posición</p>
              <p className="text-xl font-black leading-none">#{myRank}</p>
            </div>
          </div>

          {/* Question */}
          <Card className="p-4">
            <div
              className="text-base sm:text-xl font-bold text-center leading-snug prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: currentQuestion.question_text }}
            />
            {currentQuestion.image_url && (
              <div className="mt-3">
                <img src={currentQuestion.image_url} alt="Question" className="w-full max-h-48 object-contain rounded-lg mx-auto" />
              </div>
            )}
            {currentQuestion.video_url && (
              <div className="mt-3">
                <video src={currentQuestion.video_url} controls className="w-full max-h-48 rounded-lg mx-auto" />
              </div>
            )}
          </Card>

          {/* Options — 2 cols always on mobile, larger buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <AnimatePresence>
              {currentQuestion.options.map((option: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07 }}
                >
                  <button
                    onClick={() => handleSelectAnswer(index)}
                    disabled={hasAnswered}
                    className={`w-full rounded-xl p-3 text-white font-semibold text-sm leading-snug flex flex-col items-center justify-center gap-1.5 min-h-[72px] transition-transform active:scale-95 ${getOptionColors(index)} ${
                      selectedAnswer === index ? 'ring-4 ring-white/80 scale-[0.97]' : ''
                    } ${hasAnswered && index === currentQuestion.correct_answer ? 'ring-4 ring-white' : ''} ${hasAnswered ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {option.image_url && (
                      <img src={option.image_url} alt={`Opción ${index + 1}`} className="w-full h-16 object-cover rounded-lg" />
                    )}
                    <span className="text-center">{option.text}</span>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Feedback after answer */}
          <AnimatePresence>
            {feedback?.show && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`rounded-2xl px-5 py-4 text-center ${feedback.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
              >
                <p className="text-xl font-black">{feedback.isCorrect ? '¡Correcto! 🎉' : 'Incorrecto 😞'}</p>
                <p className="text-base font-semibold mt-0.5">{feedback.isCorrect ? `+${feedback.points} puntos` : 'Sin puntos'}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feedback from question */}
          {feedback?.show && currentQuestion.feedback && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="p-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <h3 className="text-xs font-semibold mb-1.5 text-blue-900 dark:text-blue-100">📚 Retroalimentación</h3>
                <div className="prose prose-sm max-w-none dark:prose-invert text-xs" dangerouslySetInnerHTML={{ __html: currentQuestion.feedback }} />
              </Card>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveGamePlay;
