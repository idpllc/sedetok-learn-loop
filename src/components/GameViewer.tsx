import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Clock, RotateCcw, Trophy, Heart, ClipboardList } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useXP } from "@/hooks/useXP";
import { ColumnMatchViewer } from "./ColumnMatchViewer";
import { WordWheelViewer } from "./WordWheelViewer";
import { InteractiveImageViewer } from "./game/InteractiveImageViewer";
import { useGameSounds } from "@/hooks/useGameSounds";
import { CreateUnifiedEvaluationEvent } from "./CreateUnifiedEvaluationEvent";

interface GameViewerProps {
  gameId: string;
  onComplete?: () => void;
  evaluationEventId?: string;
  showResultsImmediately?: boolean;
}

interface GameQuestion {
  id: string;
  question_text: string;
  correct_sentence: string;
  words: string[];
  points: number;
  order_index: number;
  image_url?: string;
  video_url?: string;
  point_x?: number;
  point_y?: number;
  lives_cost?: number;
  feedback?: string;
}

interface GameData {
  id: string;
  title: string;
  description: string;
  time_limit?: number;
  random_order: boolean;
  game_type: string;
}

export const GameViewer = ({ gameId, onComplete, evaluationEventId, showResultsImmediately = true }: GameViewerProps) => {
  const { user } = useAuth();
  const { awardProfileXP } = useXP();
  const { playLoseLife, playTimeWarning, playClick, playVictory } = useGameSounds();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [lives, setLives] = useState(3);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);

  // Helper functions defined before useEffects
  const shuffleArray = (array: string[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const completeGame = async () => {
    setIsCompleted(true);
    playVictory();

    if (!user) {
      toast.error("Debes iniciar sesión para guardar tus resultados");
      // Don't call onComplete here - let user close manually
      return;
    }

    try {
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      // Normalize score to 100 points
      const normalizedScore = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
      const passed = normalizedScore >= 60;

      // Save result to database
      const payload: any = {
        user_id: user.id,
        game_id: gameId,
        score: normalizedScore,
        max_score: 100,
        passed,
      };

      if (evaluationEventId) {
        payload.evaluation_event_id = evaluationEventId;
      }

      await supabase.from("user_quiz_results").insert(payload);

      // Award 100 XP for game completion
      awardProfileXP('game_complete', 100);

      if (showResultsImmediately) {
        toast.success(`¡Juego completado! Puntuación: ${normalizedScore}/100`);
      }
    } catch (error) {
      console.error("Error saving game result:", error);
      toast.error("Error al guardar el resultado");
    }

    // Don't call onComplete here - let user close manually via button
  };

  const fetchGameData = async () => {
    try {
      const { data: game, error } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .maybeSingle();

      if (error) throw error;
      if (!game) {
        setLoading(false);
        toast.error("Juego no encontrado");
        return;
      }

      setGameData({
        id: game.id,
        title: game.title,
        description: game.description,
        time_limit: game.time_limit,
        random_order: game.random_order,
        game_type: game.game_type || "word_order",
      });

      // Fetch questions for word_order and interactive_image types
      if (game.game_type === "word_order" || game.game_type === "interactive_image" || !game.game_type) {
        const { data: questionsData, error: questionsError } = await supabase
          .from("game_questions")
          .select("*")
          .eq("game_id", gameId)
          .order("order_index");

        if (questionsError) throw questionsError;
        const normalized = (questionsData || []).map((q: any) => ({
          ...q,
          words: Array.isArray(q.words)
            ? (q.words as string[])
            : typeof q.words === "string"
              ? (JSON.parse(q.words) as string[])
              : [],
        })) as GameQuestion[];
        setQuestions(normalized);

        if (normalized.length > 0 && game.game_type === "word_order") {
          const first = normalized[0];
          const words = game.random_order ? shuffleArray([...first.words]) : [...first.words];
          setAvailableWords(words);
          setStartTime(Date.now());
        }
      }

      if (game.time_limit) setTimeRemaining(game.time_limit);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching game:", err);
      toast.error("Error al cargar el juego");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameData();
  }, [gameId]);

  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0 && !isCompleted) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            toast.error("¡Tiempo agotado!");
            completeGame();
            return 0;
          }
          // Play warning sound when 5 seconds remain
          if (prev === 6) {
            playTimeWarning();
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, isCompleted]);

  // If it's an interactive image game, delegate to InteractiveImageViewer
  if (!loading && gameData?.game_type === "interactive_image") {
    return (
      <div
        className="h-full flex flex-col justify-center px-4 md:px-6 pt-20 pb-8 md:pt-16 md:pb-12"
        style={{ paddingTop: 'max(80px, calc(env(safe-area-inset-top, 0px) + 64px))' }}
      >
        <InteractiveImageViewer 
          imageUrl={questions[0]?.image_url || ""} 
          points={questions.map((q) => ({
            id: q.id,
            x: q.point_x || 50,
            y: q.point_y || 50,
            question: q.question_text,
            feedback: q.feedback,
            lives_cost: 1, // Fixed at 1 life per error
          }))}
          maxLives={3}
          timeLimit={gameData.time_limit}
          onComplete={async (score, maxScore) => {
            if (user) {
              await supabase.from("user_quiz_results").insert({
                user_id: user.id,
                game_id: gameId,
                score,
                max_score: 100, // Always 100 max
                passed: score >= 60,
                evaluation_event_id: evaluationEventId,
              });
              
              // Award 100 XP
              awardProfileXP('game_complete', 100);
            }
            if (onComplete) onComplete();
          }}
        />
      </div>
    );
  }

  // If it's a column match game, delegate to ColumnMatchViewer
  if (!loading && gameData?.game_type === "column_match") {
    return <ColumnMatchViewer gameId={gameId} onComplete={onComplete} evaluationEventId={evaluationEventId} showResultsImmediately={showResultsImmediately} />;
  }

  // If it's a word wheel game, delegate to WordWheelViewer
  if (!loading && gameData?.game_type === "word_wheel") {
    return <WordWheelViewer gameId={gameId} onComplete={onComplete} evaluationEventId={evaluationEventId} showResultsImmediately={showResultsImmediately} />;
  }

  const handleWordClick = (word: string, fromAvailable: boolean) => {
    if (showFeedback) return;

    playClick();
    if (fromAvailable) {
      setSelectedWords([...selectedWords, word]);
      setAvailableWords(availableWords.filter(w => w !== word));
    } else {
      const index = selectedWords.indexOf(word);
      setSelectedWords(selectedWords.filter((_, i) => i !== index));
      setAvailableWords([...availableWords, word]);
    }
  };

  const handleCheck = () => {
    if (selectedWords.length === 0) return;

    const currentQ = questions[currentQuestion];
    const userSentence = selectedWords.join(" ");
    const correct = userSentence.toLowerCase().trim() === currentQ.correct_sentence.toLowerCase().trim();

    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      playClick();
      setScore(score + currentQ.points);
      toast.success("¡Correcto!");
    } else {
      playLoseLife();
      setLives(lives - 1);
      toast.error("Incorrecto. La respuesta correcta es: " + currentQ.correct_sentence);
      
      if (lives - 1 <= 0) {
        setTimeout(() => {
          toast.error("¡Has perdido todas las vidas!");
          completeGame();
        }, 1500);
      }
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      const nextQuestion = questions[currentQuestion + 1];
      const words = gameData?.random_order 
        ? shuffleArray([...(nextQuestion.words as string[])])
        : [...(nextQuestion.words as string[])];
      
      setCurrentQuestion(currentQuestion + 1);
      setSelectedWords([]);
      setAvailableWords(words);
      setShowFeedback(false);
      setIsCorrect(false);
    } else {
      completeGame();
    }
  };

  const handleReset = () => {
    const currentQ = questions[currentQuestion];
    const words = gameData?.random_order 
      ? shuffleArray([...(currentQ.words as string[])])
      : [...(currentQ.words as string[])];
    
    setSelectedWords([]);
    setAvailableWords(words);
    setShowFeedback(false);
    setIsCorrect(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Cargando juego...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">No hay preguntas disponibles</p>
      </div>
    );
  }

  if (isCompleted) {
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    // Normalize score to 100 points
    const normalizedScore = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center space-y-6">
            <Trophy className="w-20 h-20 mx-auto text-yellow-500" />
            <h2 className="text-3xl font-bold">¡Juego Completado!</h2>
            <div className="space-y-4">
              <div className="text-5xl font-bold text-primary">{normalizedScore}/100</div>
              <p className="text-xl text-muted-foreground">
                {normalizedScore >= 60 ? '¡Aprobado!' : 'Sigue practicando'}
              </p>
            </div>
            <Button onClick={onComplete} size="lg" className="w-full max-w-xs">
              Cerrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div 
      className="h-full overflow-y-auto px-4 md:px-6 pt-20 pb-8 md:pt-16 md:pb-12"
      style={{ paddingTop: 'max(80px, calc(env(safe-area-inset-top, 0px) + 64px))' }}
    >
      <div className="max-w-4xl mx-auto space-y-6 flex flex-col justify-center min-h-full">
        {/* Header */}
        <div className="flex items-center justify-between pr-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {[...Array(3)].map((_, i) => (
                <Heart
                  key={i}
                  className={`w-5 h-5 ${
                    i < lives
                      ? "fill-red-500 text-red-500"
                      : "fill-muted text-muted"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              Pregunta {currentQuestion + 1} de {questions.length}
            </span>
            {timeRemaining !== null && (
              <div className="flex items-center gap-2 text-primary">
                <Clock className="w-4 h-4" />
                <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium">
              Puntos: <span className="text-primary font-bold">{score}</span>
            </div>
            {!evaluationEventId && user && gameData && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEvaluationModal(true)}
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Evaluar este juego
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question */}
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">{currentQ.question_text}</h3>
              <p className="text-sm text-muted-foreground">
                Ordena las palabras para formar la oración correcta
              </p>
            </div>

            {/* Media */}
            {currentQ.image_url && (
              <img 
                src={currentQ.image_url} 
                alt="Question" 
                className="w-full max-h-64 object-contain rounded-lg"
              />
            )}

            {/* Selected words area */}
            <div className="min-h-24 p-4 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20">
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {selectedWords.map((word, index) => (
                    <motion.button
                      key={`selected-${index}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      onClick={() => handleWordClick(word, false)}
                      disabled={showFeedback}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                    >
                      {word}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Available words */}
            <div className="flex flex-wrap gap-2 justify-center">
              <AnimatePresence>
                {availableWords.map((word, index) => (
                  <motion.button
                    key={`available-${index}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    onClick={() => handleWordClick(word, true)}
                    disabled={showFeedback}
                    className="px-4 py-2 bg-card border-2 border-border rounded-lg font-medium hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                  >
                    {word}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>

            {/* Feedback */}
            <AnimatePresence>
              {showFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-lg border-2 ${
                    isCorrect 
                      ? "bg-green-500/10 border-green-500 text-green-700 dark:text-green-400" 
                      : "bg-red-500/10 border-red-500 text-red-700 dark:text-red-400"
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {isCorrect ? (
                      <>
                        <Check className="w-5 h-5" />
                        ¡Correcto! +{currentQ.points} puntos
                      </>
                    ) : (
                      <>
                        <X className="w-5 h-5" />
                        Respuesta correcta: {currentQ.correct_sentence}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={showFeedback}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reiniciar
              </Button>
              
              {!showFeedback ? (
                <Button
                  onClick={handleCheck}
                  disabled={selectedWords.length === 0}
                >
                  Verificar
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  {currentQuestion < questions.length - 1 ? "Siguiente" : "Finalizar"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {gameData && (
        <CreateUnifiedEvaluationEvent
          gameId={gameId}
          open={showEvaluationModal}
          onOpenChange={setShowEvaluationModal}
        />
      )}
    </div>
  );
};
