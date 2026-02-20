import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TriviaQuestion, TriviaCategory } from "@/hooks/useTriviaGame";
import { useGameSounds } from "@/hooks/useGameSounds";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Award, Zap } from "lucide-react";
import confetti from "canvas-confetti";

interface TriviaGameplayProps {
  questions: TriviaQuestion[];
  category: TriviaCategory;
  onGameEnd: (result: {
    points_earned: number;
    correct_answers: number;
    incorrect_answers: number;
    questions_answered: number;
    best_streak: number;
    duration_seconds: number;
  }) => void;
}

export const TriviaGameplay = ({ questions, category, onGameEnd }: TriviaGameplayProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [startTime] = useState(Date.now());
  
  const { playCorrect, playLoseLife, playVictory, playTimeWarning } = useGameSounds();

  const currentQuestion = questions[currentQuestionIndex];
  const timePercentage = (timeLeft / 20) * 100;

  useEffect(() => {
    if (showFeedback || !currentQuestion) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeout();
          return 20;
        }
        if (prev === 6) {
          playTimeWarning();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex, showFeedback]);

  const handleTimeout = () => {
    playLoseLife();
    setIncorrectCount(prev => prev + 1);
    setStreak(0);
    setShowFeedback(true);
    setTimeout(nextQuestion, 2000);
  };

  const handleAnswer = (answerIndex: number) => {
    if (showFeedback || selectedAnswer !== null) return;

    setSelectedAnswer(answerIndex);
    setShowFeedback(true);

    const isCorrect = answerIndex === currentQuestion.correct_answer;
    
    if (isCorrect) {
      playCorrect();
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak(Math.max(bestStreak, newStreak));
      
      // Calculate points with streak bonus
      const basePoints = currentQuestion.points;
      const streakBonus = Math.floor(basePoints * (newStreak * 0.1));
      const totalPoints = basePoints + streakBonus;
      
      setScore(prev => prev + totalPoints);
      setCorrectCount(prev => prev + 1);

      // Confetti effect
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    } else {
      playLoseLife();
      setStreak(0);
      setIncorrectCount(prev => prev + 1);
    }

    setTimeout(nextQuestion, 2500);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setTimeLeft(20);
    } else {
      endGame();
    }
  };

  const endGame = () => {
    playVictory();
    const duration = Math.floor((Date.now() - startTime) / 1000);
    
    onGameEnd({
      points_earned: score,
      correct_answers: correctCount,
      incorrect_answers: incorrectCount,
      questions_answered: questions.length,
      best_streak: bestStreak,
      duration_seconds: duration,
    });
  };

  if (!currentQuestion) return null;

  return (
    <div className="container max-w-2xl mx-auto px-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge 
          className="text-sm px-3 py-1.5"
          style={{ backgroundColor: category.color }}
        >
          {category.icon} {category.name}
        </Badge>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-sm">
            <Award className="w-4 h-4" />
            <span>{score} pts</span>
          </div>
          
          {streak > 1 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold"
            >
              <Zap className="w-3 h-3" />
              x{streak}
            </motion.div>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Pregunta {currentQuestionIndex + 1} de {questions.length}</span>
          <div className={`flex items-center gap-1.5 font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : ''}`}>
            <Clock className="w-3.5 h-3.5" />
            {timeLeft}s
          </div>
        </div>
        <Progress value={(currentQuestionIndex / questions.length) * 100} className="h-1.5" />
        <Progress 
          value={timePercentage} 
          className={`h-1.5 ${timeLeft <= 5 ? 'bg-red-100' : ''}`}
        />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardContent className="p-4 space-y-4">
              <h2 className="text-base md:text-xl font-bold text-center leading-snug">
                {currentQuestion.question_text}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrect = index === currentQuestion.correct_answer;
                  const showCorrect = showFeedback && isCorrect;
                  const showIncorrect = showFeedback && isSelected && !isCorrect;

                  return (
                    <Button
                      key={index}
                      onClick={() => handleAnswer(index)}
                      disabled={showFeedback || selectedAnswer !== null}
                      variant="outline"
                      className={`h-auto min-h-[56px] text-sm font-semibold whitespace-normal p-3 transition-all ${
                        showCorrect ? '!bg-green-500 hover:!bg-green-600 !text-white !border-green-600' : 
                        showIncorrect ? '!bg-red-500 hover:!bg-red-600 !text-white !border-red-600' : 
                        'bg-card text-foreground border-2 hover:scale-[1.02]'
                      }`}
                    >
                      <span className="block w-full text-center leading-snug">
                        {option.option_text || `Opción ${index + 1}`}
                      </span>
                    </Button>
                  );
                })}
              </div>

              {showFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-center font-bold text-sm ${
                    selectedAnswer === currentQuestion.correct_answer ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {selectedAnswer === currentQuestion.correct_answer ? (
                    <>
                      <div className="text-3xl mb-1">🎉</div>
                      <div>¡Correcto! +{currentQuestion.points} puntos</div>
                      {streak > 1 && (
                        <div className="text-orange-500 mt-0.5">
                          ¡Racha de {streak}! Bonus: +{Math.floor(currentQuestion.points * (streak * 0.1))} pts
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-3xl mb-1">😞</div>
                      <div className="text-xs">Respuesta correcta: {currentQuestion.options[currentQuestion.correct_answer].option_text}</div>
                    </>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Stats mini */}
      <div className="flex items-center justify-around text-center bg-card/60 backdrop-blur rounded-xl px-4 py-2.5 border border-border/40">
        <div>
          <div className="text-lg font-bold text-green-600 leading-none">{correctCount}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Correctas</div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div>
          <div className="text-lg font-bold text-red-600 leading-none">{incorrectCount}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Incorrectas</div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div>
          <div className="text-lg font-bold text-orange-600 leading-none">{bestStreak}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Racha</div>
        </div>
      </div>
    </div>
  );
};
