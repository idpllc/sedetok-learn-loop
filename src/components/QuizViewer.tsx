import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface QuizViewerProps {
  quizId: string;
  onComplete?: () => void;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  image_url?: string;
  video_url?: string;
  feedback?: string;
  points: number;
  quiz_options: Array<{
    id: string;
    option_text: string;
    is_correct: boolean;
    order_index: number;
  }>;
}

export const QuizViewer = ({ quizId, onComplete }: QuizViewerProps) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuestions();
  }, [quizId]);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*, quiz_options(*)")
        .eq("content_id", quizId)
        .order("order_index", { ascending: true });

      if (error) throw error;

      setQuestions(data as Question[]);
    } catch (error) {
      console.error("Error loading questions:", error);
      toast.error("Error al cargar el quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (optionId: string) => {
    if (showFeedback) return;

    setSelectedAnswer(optionId);
    setShowFeedback(true);

    const currentQ = questions[currentQuestion];
    const selectedOption = currentQ.quiz_options.find((opt) => opt.id === optionId);

    if (selectedOption?.is_correct) {
      setScore(score + currentQ.points);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      completeQuiz();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    }
  };

  const completeQuiz = async () => {
    setIsCompleted(true);

    if (user) {
      try {
        const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
        const passed = (score / maxScore) * 100 >= 60; // 60% to pass

        await supabase.from("user_quiz_results").insert({
          user_id: user.id,
          quiz_id: quizId,
          score,
          max_score: maxScore,
          passed,
        });

        if (passed) {
          toast.success("¡Felicitaciones! Has aprobado el quiz");
        }
      } catch (error) {
        console.error("Error saving quiz result:", error);
      }
    }

    onComplete?.();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Cargando quiz...</p>
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

  const currentQ = questions[currentQuestion];
  const maxScore = questions.reduce((sum, q) => sum + q.points, 0);

  if (isCompleted) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <div className="text-6xl">{score >= maxScore * 0.6 ? "🎉" : "📚"}</div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Quiz Completado</h3>
              <p className="text-4xl font-bold text-primary mb-2">
                {score} / {maxScore}
              </p>
              <p className="text-muted-foreground">
                {score >= maxScore * 0.6 ? "¡Excelente trabajo!" : "Sigue practicando"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Quiz content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full flex items-center justify-center p-6"
          >
            <div className="w-full max-w-2xl space-y-6">
              {/* Question number and points */}
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold">
                  Pregunta {currentQuestion + 1} de {questions.length}
                </span>
                <span className="text-muted-foreground">{currentQ.points} puntos</span>
              </div>

              {/* Question */}
              <Card>
                <CardContent className="p-6 space-y-6">
                  <h3 className="text-xl font-bold">{currentQ.question_text}</h3>

                  {currentQ.image_url && (
                    <img
                      src={currentQ.image_url}
                      alt="Question"
                      className="w-full rounded-lg max-h-64 object-cover"
                    />
                  )}

                  {currentQ.video_url && (
                    <div className="aspect-video">
                      <iframe
                        src={currentQ.video_url.replace("watch?v=", "embed/")}
                        className="w-full h-full rounded-lg"
                        allowFullScreen
                      />
                    </div>
                  )}

                  {/* Options */}
                  <div className="space-y-3">
                    {currentQ.quiz_options
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((option) => {
                        const isSelected = selectedAnswer === option.id;
                        const isCorrect = option.is_correct;
                        const showResult = showFeedback && isSelected;

                        return (
                          <Button
                            key={option.id}
                            variant="outline"
                            className={`w-full justify-start text-left h-auto p-4 ${
                              showResult
                                ? isCorrect
                                  ? "bg-green-100 border-green-500 dark:bg-green-900/20"
                                  : "bg-red-100 border-red-500 dark:bg-red-900/20"
                                : isSelected
                                ? "bg-primary/10 border-primary"
                                : ""
                            }`}
                            onClick={() => handleAnswer(option.id)}
                            disabled={showFeedback}
                          >
                            <span className="flex-1">{option.option_text}</span>
                            {showResult && (
                              <span className="ml-2">
                                {isCorrect ? (
                                  <Check className="h-5 w-5 text-green-600" />
                                ) : (
                                  <X className="h-5 w-5 text-red-600" />
                                )}
                              </span>
                            )}
                          </Button>
                        );
                      })}
                  </div>

                  {/* Feedback */}
                  {showFeedback && currentQ.feedback && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-muted rounded-lg"
                    >
                      <p className="text-sm">{currentQ.feedback}</p>
                    </motion.div>
                  )}
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Anterior
                </Button>

                <div className="text-sm font-semibold">
                  Puntos: {score} / {maxScore}
                </div>

                <Button onClick={handleNext} disabled={!showFeedback}>
                  {currentQuestion === questions.length - 1 ? "Finalizar" : "Siguiente"}
                  {currentQuestion < questions.length - 1 && (
                    <ChevronRight className="h-4 w-4 ml-2" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
