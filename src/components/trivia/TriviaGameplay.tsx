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
    <div className="container max-w-4xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Badge 
          className="text-lg px-4 py-2"
          style={{ backgroundColor: category.color }}
        >
          {category.icon} {category.name}
        </Badge>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-lg font-bold">
            <Award className="w-5 h-5" />
            <span>{score} pts</span>
          </div>
          
          {streak > 1 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 bg-orange-500 text-white px-3 py-1 rounded-full font-bold"
            >
              <Zap className="w-4 h-4" />
              x{streak}
            </motion.div>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Pregunta {currentQuestionIndex + 1} de {questions.length}</span>
          <div className={`flex items-center gap-2 font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : ''}`}>
            <Clock className="w-4 h-4" />
            {timeLeft}s
          </div>
        </div>
        <Progress value={(currentQuestionIndex / questions.length) * 100} />
        <Progress 
          value={timePercentage} 
          className={timeLeft <= 5 ? 'bg-red-100' : ''}
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
            <CardContent className="p-6 space-y-6">
              <h2 className="text-xl md:text-2xl font-bold text-center">
                {currentQuestion.question_text}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      variant={showCorrect ? "default" : showIncorrect ? "destructive" : "outline"}
                      className={`h-auto min-h-[80px] text-base font-medium whitespace-normal p-4 transition-all ${
                        showCorrect ? 'bg-green-500 border-green-600' : 
                        showIncorrect ? 'bg-red-500 border-red-600' : 
                        'hover:scale-105'
                      }`}
                    >
                      {option}
                    </Button>
                  );
                })}
              </div>

              {showFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-center font-bold text-lg ${
                    selectedAnswer === currentQuestion.correct_answer ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {selectedAnswer === currentQuestion.correct_answer ? (
                    <>
                      <div className="text-4xl mb-2">🎉</div>
                      <div>¡Correcto! +{currentQuestion.points} puntos</div>
                      {streak > 1 && (
                        <div className="text-orange-500 mt-1">
                          ¡Racha de {streak}! Bonus: +{Math.floor(currentQuestion.points * (streak * 0.1))} pts
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-4xl mb-2">😞</div>
                      <div>Incorrecto. La respuesta correcta era: {currentQuestion.options[currentQuestion.correct_answer]}</div>
                    </>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Stats */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-around text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{correctCount}</div>
              <div className="text-xs text-muted-foreground">Correctas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{incorrectCount}</div>
              <div className="text-xs text-muted-foreground">Incorrectas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{bestStreak}</div>
              <div className="text-xs text-muted-foreground">Mejor Racha</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
