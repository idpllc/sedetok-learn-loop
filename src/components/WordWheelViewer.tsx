import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Heart, Trophy, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useXP } from "@/hooks/useXP";

interface WordWheelViewerProps {
  gameId: string;
  onComplete?: () => void;
}

interface WheelQuestion {
  id: string;
  question_text: string;
  correct_sentence: string;
  initial_letter: string;
  points: number;
  order_index: number;
}

interface GameData {
  id: string;
  title: string;
  description: string;
  time_limit?: number;
}

type LetterState = "pending" | "correct" | "failed" | "skipped";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const WordWheelViewer = ({ gameId, onComplete }: WordWheelViewerProps) => {
  const { user } = useAuth();
  const { awardXP } = useXP();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [questions, setQuestions] = useState<WheelQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [letterStates, setLetterStates] = useState<Record<string, LetterState>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const fetchGameData = async () => {
    try {
      const { data: game, error } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .maybeSingle();

      if (error) throw error;
      if (!game) {
        toast.error("Juego no encontrado");
        setLoading(false);
        return;
      }

      setGameData({
        id: game.id,
        title: game.title,
        description: game.description,
        time_limit: game.time_limit,
      });

      const { data: questionsData, error: questionsError } = await supabase
        .from("game_questions")
        .select("*")
        .eq("game_id", gameId)
        .order("order_index");

      if (questionsError) throw questionsError;
      
      const normalized = (questionsData || []).map((q: any) => ({
        id: q.id,
        question_text: q.question_text,
        correct_sentence: q.correct_sentence,
        initial_letter: q.initial_letter || "A",
        points: q.points || 10,
        order_index: q.order_index,
      })) as WheelQuestion[];
      
      setQuestions(normalized);

      // Initialize letter states
      const states: Record<string, LetterState> = {};
      normalized.forEach(q => {
        states[q.initial_letter.toUpperCase()] = "pending";
      });
      setLetterStates(states);

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
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, isCompleted]);

  const completeGame = async () => {
    setIsCompleted(true);

    if (!user) {
      toast.error("Debes iniciar sesión para guardar tus resultados");
      return;
    }

    try {
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      const normalizedScore = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

      awardXP(gameId, 'view_complete', false);
      toast.success(`¡Juego completado! Puntuación: ${normalizedScore}/100`);
    } catch (error) {
      console.error("Error saving game result:", error);
      toast.error("Error al guardar el resultado");
    }
  };

  const handleSubmit = () => {
    if (!userAnswer.trim()) {
      toast.error("Escribe una respuesta");
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    const userAnswerClean = userAnswer.trim().toLowerCase();
    const correctAnswer = currentQuestion.correct_sentence.toLowerCase();
    const firstLetter = userAnswerClean.charAt(0).toUpperCase();

    // Check if answer starts with correct letter
    if (firstLetter !== currentQuestion.initial_letter.toUpperCase()) {
      toast.error(`La palabra debe empezar con ${currentQuestion.initial_letter.toUpperCase()}`);
      setLives(lives - 1);
      setLetterStates(prev => ({
        ...prev,
        [currentQuestion.initial_letter.toUpperCase()]: "failed"
      }));

      if (lives - 1 <= 0) {
        toast.error("¡Has perdido todas las vidas!");
        completeGame();
        return;
      }

      moveToNext();
      return;
    }

    // Check if answer is correct
    if (userAnswerClean === correctAnswer) {
      toast.success("¡Correcto!");
      setScore(score + currentQuestion.points);
      setLetterStates(prev => ({
        ...prev,
        [currentQuestion.initial_letter.toUpperCase()]: "correct"
      }));
      moveToNext();
    } else {
      toast.error(`Incorrecto. La respuesta era: ${currentQuestion.correct_sentence}`);
      setLives(lives - 1);
      setLetterStates(prev => ({
        ...prev,
        [currentQuestion.initial_letter.toUpperCase()]: "failed"
      }));

      if (lives - 1 <= 0) {
        toast.error("¡Has perdido todas las vidas!");
        completeGame();
        return;
      }

      moveToNext();
    }
  };

  const handleSkip = () => {
    const currentQuestion = questions[currentQuestionIndex];
    setLetterStates(prev => ({
      ...prev,
      [currentQuestion.initial_letter.toUpperCase()]: "skipped"
    }));
    moveToNext();
  };

  const moveToNext = () => {
    setUserAnswer("");
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      completeGame();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getLetterColor = (letter: string): string => {
    const state = letterStates[letter];
    if (state === "correct") return "hsl(var(--chart-2))"; // green
    if (state === "failed") return "hsl(var(--destructive))"; // red
    if (state === "skipped") return "hsl(var(--muted))"; // gray
    return "hsl(var(--card))"; // white/default
  };

  const getLetterTextColor = (letter: string): string => {
    const state = letterStates[letter];
    if (state === "correct") return "white";
    if (state === "failed") return "white";
    if (state === "skipped") return "hsl(var(--muted-foreground))";
    return "hsl(var(--foreground))";
  };

  const calculateLetterPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const radius = 180;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  const correctCount = Object.values(letterStates).filter(s => s === "correct").length;
  const totalQuestions = questions.length;

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
                Respondiste {correctCount} de {totalQuestions} correctamente
              </p>
              <p className="text-lg">
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

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="h-full overflow-y-auto p-2 md:p-3 bg-gradient-to-br from-background to-muted/20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
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
          <div className="flex items-center gap-4">
            {timeRemaining !== null && (
              <div className="flex items-center gap-1 text-primary">
                <Clock className="w-4 h-4" />
                <span className="font-mono font-bold text-base">{formatTime(timeRemaining)}</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="font-bold text-base">{score}</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-3">
          <h2 className="text-xl font-bold mb-1">{gameData?.title}</h2>
          <p className="text-sm text-muted-foreground">{gameData?.description}</p>
        </div>

        {/* Question */}
        <Card className="mb-4">
          <CardContent className="p-3">
            <p className="text-base text-center font-medium">{currentQuestion.question_text}</p>
          </CardContent>
        </Card>

        {/* Wheel Container */}
        <div className="relative w-full max-w-3xl mx-auto aspect-square flex items-center justify-center">
          {/* Letters Circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            {ALPHABET.map((letter, index) => {
              const { x, y } = calculateLetterPosition(index, ALPHABET.length);
              const hasQuestion = letterStates[letter] !== undefined;
              
              return (
                <motion.div
                  key={letter}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="absolute"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                      hasQuestion ? "shadow-lg" : "opacity-50"
                    }`}
                    style={{
                      backgroundColor: hasQuestion ? getLetterColor(letter) : "hsl(var(--muted))",
                      color: hasQuestion ? getLetterTextColor(letter) : "hsl(var(--muted-foreground))",
                      border: currentQuestion.initial_letter.toUpperCase() === letter 
                        ? "3px solid hsl(var(--primary))" 
                        : "2px solid transparent",
                    }}
                  >
                    {letter}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Center Content */}
          <div className="relative z-10 w-56 space-y-2">
            <div className="bg-card/95 backdrop-blur-sm p-3 rounded-xl shadow-2xl border-2 border-primary/20">
              <div className="text-center mb-2">
                <p className="text-xs text-muted-foreground mb-1">Empieza por</p>
                <div className="text-3xl font-bold text-primary">
                  {currentQuestion.initial_letter.toUpperCase()}
                </div>
              </div>
              
              <Input
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                placeholder="Tu respuesta..."
                className="text-center text-sm font-medium mb-2 h-9"
                autoFocus
              />

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  className="flex-1 h-8 text-sm"
                  disabled={!userAnswer.trim()}
                >
                  Enviar
                </Button>
                <Button
                  onClick={handleSkip}
                  variant="outline"
                  className="flex-1 h-8 text-sm"
                >
                  Pasar
                </Button>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="bg-card/80 backdrop-blur-sm p-2 rounded-lg text-center border border-border">
              <div className="text-xs font-medium">
                <span className="text-primary font-bold">{correctCount}</span>
                <span className="text-muted-foreground">/{totalQuestions}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
