import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface QuizViewerProps {
  quizId: string;
  lastAttempt?: any;
  onComplete?: () => void;
  onQuizComplete?: (passed: boolean) => void;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  image_url?: string;
  video_url?: string;
  feedback?: string;
  feedback_correct?: string;
  feedback_incorrect?: string;
  comparison_mode?: string;
  points: number;
  quiz_options: Array<{
    id: string;
    option_text: string;
    is_correct: boolean;
    order_index: number;
    image_url?: string;
    video_url?: string;
  }>;
}

export const QuizViewer = ({ quizId, lastAttempt, onComplete, onQuizComplete }: QuizViewerProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizSubject, setQuizSubject] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [shortAnswerText, setShortAnswerText] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean>(false);
  useEffect(() => {
    fetchQuizData();
  }, [quizId]);

  const fetchQuizData = async () => {
    try {
      // Fetch quiz info to get subject
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("subject, category")
        .eq("id", quizId)
        .maybeSingle();

      if (quizError) throw quizError;
      setQuizSubject(quizData?.subject || quizData?.category || null);

      // Fetch questions
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

  const validateShortAnswer = (userAnswer: string, correctAnswers: string[], comparisonMode: string = 'exact'): boolean => {
    const normalizedUserAnswer = userAnswer.trim().toLowerCase();
    
    if (comparisonMode === 'exact') {
      // Comparación exacta sin mayúsculas/minúsculas
      return correctAnswers.some(answer => 
        answer.trim().toLowerCase() === normalizedUserAnswer
      );
    } else {
      // Comparación flexible (80% de coincidencia)
      return correctAnswers.some(answer => {
        const normalizedCorrect = answer.trim().toLowerCase();
        const similarity = calculateSimilarity(normalizedUserAnswer, normalizedCorrect);
        return similarity >= 0.8;
      });
    }
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  const getEditDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const handleAnswer = (optionId: string) => {
    if (showFeedback) return;

    setSelectedAnswer(optionId);
    setShowFeedback(true);
    setUserAnswers({ ...userAnswers, [currentQuestion]: optionId });

    const currentQ = questions[currentQuestion];
    const selectedOption = currentQ.quiz_options.find((opt) => opt.id === optionId);

    if (selectedOption?.is_correct) {
      setScore(score + currentQ.points);
      setIsAnswerCorrect(true);
    } else {
      setIsAnswerCorrect(false);
    }
  };

  const handleShortAnswer = () => {
    if (showFeedback || !shortAnswerText.trim()) return;

    const currentQ = questions[currentQuestion];
    const correctAnswers = currentQ.quiz_options.map(opt => opt.option_text);
    const isCorrect = validateShortAnswer(
      shortAnswerText, 
      correctAnswers, 
      currentQ.comparison_mode || 'exact'
    );

    setShowFeedback(true);
    setIsAnswerCorrect(isCorrect);
    setUserAnswers({ ...userAnswers, [currentQuestion]: shortAnswerText });

    if (isCorrect) {
      setScore(score + currentQ.points);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShortAnswerText("");
      setShowFeedback(false);
      setIsAnswerCorrect(false);
    } else {
      completeQuiz();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(null);
      setShortAnswerText("");
      setShowFeedback(false);
      setIsAnswerCorrect(false);
    }
  };

  const completeQuiz = async () => {
    setIsCompleted(true);

    if (!user) {
      console.error("No user logged in");
      toast.error("Debes iniciar sesión para guardar tus resultados");
      onComplete?.();
      return;
    }

    try {
      // Calculate max score based on total points
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      
      // Normalize score to 100
      const normalizedScore = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
      const passed = normalizedScore >= 60; // 60% to pass

      console.log("Attempting to save quiz result:", {
        user_id: user.id,
        quiz_id: quizId,
        score: normalizedScore,
        max_score: 100,
        passed
      });

      const payload = {
        user_id: user.id,
        quiz_id: quizId,
        score: normalizedScore,
        max_score: 100,
        passed,
      };

      // Try insert including optional columns; if columns don't exist yet, retry without them
      let insertError: any = null;
      let insertData: any = null;

      const attempt1 = await supabase
        .from("user_quiz_results")
        .insert({ ...payload, area_academica: quizSubject, no_documento: null })
        .select();

      if (attempt1.error) {
        insertError = attempt1.error;
        console.warn("Insert with optional columns failed, retrying without them:", insertError?.message);
        const attempt2 = await supabase
          .from("user_quiz_results")
          .insert(payload)
          .select();
        insertError = attempt2.error;
        insertData = attempt2.data;
      } else {
        insertData = attempt1.data;
      }

      if (insertError) {
        console.error("Error saving quiz result:", insertError);
        const msg = insertError?.message || "Error desconocido";
        toast.error(`Error al guardar el resultado: ${msg}`);
        return;
      }

      console.log("Quiz result saved successfully:", insertData);

      if (passed) {
        toast.success("¡Felicitaciones! Has aprobado el quiz");
        // Notify quiz completion
        if (onQuizComplete) {
          onQuizComplete(true);
        }
      } else {
        toast.info("Sigue practicando para mejorar tu puntuación");
        if (onQuizComplete) {
          onQuizComplete(false);
        }
      }

      // Invalidar la query para actualizar el último intento
      queryClient.invalidateQueries({ queryKey: ["quiz-attempts", quizId, user.id] });
    } catch (error) {
      console.error("Error saving quiz result:", error);
      toast.error("Error al guardar el resultado del quiz");
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
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const normalizedScore = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

  if (isCompleted) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 md:p-8 text-center space-y-6">
            <div className="text-6xl">{normalizedScore >= 60 ? "🎉" : "📚"}</div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Quiz Completado</h3>
              <p className="text-4xl font-bold text-primary mb-2">
                {normalizedScore} / 100
              </p>
              <p className="text-muted-foreground">
                {normalizedScore >= 60 ? "¡Excelente trabajo!" : "Sigue practicando"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-muted flex-shrink-0">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Quiz content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="min-h-full flex items-center justify-center px-3 py-4 md:p-6"
          >
            <div className="w-full max-w-2xl space-y-4 md:space-y-6">
              {/* Question number and points */}
              <div className="flex justify-between items-center text-xs md:text-sm">
                <span className="font-semibold">
                  Pregunta {currentQuestion + 1} de {questions.length}
                </span>
                <span className="text-muted-foreground">{currentQ.points} puntos</span>
              </div>

              {/* Question */}
              <Card>
                <CardContent className="p-3 md:p-6 space-y-4 md:space-y-6">
                  <h3 className="text-base md:text-xl font-bold leading-tight break-words">{currentQ.question_text}</h3>

                  {currentQ.image_url && (
                    <img
                      src={currentQ.image_url}
                      alt="Question"
                      className="w-full rounded-lg max-h-48 md:max-h-64 object-cover"
                    />
                  )}

                   {currentQ.video_url && (
                    <div className="aspect-video w-full">
                      <iframe
                        src={currentQ.video_url.replace("watch?v=", "embed/")}
                        className="w-full h-full rounded-lg"
                        allowFullScreen
                      />
                    </div>
                  )}

                   {/* Options for multiple choice and true/false */}
                   {(currentQ.question_type === "multiple_choice" || currentQ.question_type === "true_false") && (
                    <div className="space-y-2 md:space-y-3 w-full">
                      {currentQ.quiz_options
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((option, index) => {
                          const isSelected = selectedAnswer === option.id;
                          const isCorrect = option.is_correct;
                          const showResult = showFeedback && isSelected;
                          
                          // Array de colores vibrantes para estudiantes
                          const colors = [
                            'bg-gradient-to-r from-blue-400/20 to-blue-500/20 border-blue-400 hover:from-blue-400/30 hover:to-blue-500/30',
                            'bg-gradient-to-r from-purple-400/20 to-purple-500/20 border-purple-400 hover:from-purple-400/30 hover:to-purple-500/30',
                            'bg-gradient-to-r from-pink-400/20 to-pink-500/20 border-pink-400 hover:from-pink-400/30 hover:to-pink-500/30',
                            'bg-gradient-to-r from-orange-400/20 to-orange-500/20 border-orange-400 hover:from-orange-400/30 hover:to-orange-500/30',
                            'bg-gradient-to-r from-teal-400/20 to-teal-500/20 border-teal-400 hover:from-teal-400/30 hover:to-teal-500/30',
                          ];
                          const colorClass = !showFeedback ? colors[index % colors.length] : '';

                           return (
                            <Button
                              key={option.id}
                              variant="outline"
                              className={`w-full justify-start text-left h-auto p-3 md:p-4 text-sm md:text-base break-words whitespace-normal ${
                                showResult
                                  ? isCorrect
                                    ? "bg-green-100 border-green-500 dark:bg-green-900/20"
                                    : "bg-red-100 border-red-500 dark:bg-red-900/20"
                                  : isSelected
                                  ? "bg-primary/10 border-primary"
                                  : colorClass
                              }`}
                              onClick={() => handleAnswer(option.id)}
                              disabled={showFeedback}
                            >
                              <div className="flex-1 space-y-2">
                                <span className="block break-words">{option.option_text}</span>
                                
                                {option.image_url && (
                                  <img 
                                    src={option.image_url} 
                                    alt="Option" 
                                    className="w-full h-32 object-cover rounded mt-2"
                                  />
                                )}
                                
                                {option.video_url && (
                                  <div className="aspect-video w-full mt-2">
                                    <iframe
                                      src={option.video_url.replace("watch?v=", "embed/")}
                                      className="w-full h-full rounded"
                                      allowFullScreen
                                    />
                                  </div>
                                )}
                              </div>
                              
                              {showResult && (
                                <span className="ml-2 flex-shrink-0">
                                  {isCorrect ? (
                                    <Check className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                                  ) : (
                                    <X className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
                                  )}
                                </span>
                              )}
                            </Button>
                          );
                        })}
                    </div>
                   )}

                   {/* Input for short answer */}
                   {currentQ.question_type === "short_answer" && (
                    <div className="space-y-3 w-full">
                      <div className="relative w-full">
                        <Input
                          value={shortAnswerText}
                          onChange={(e) => setShortAnswerText(e.target.value)}
                          placeholder="Escribe tu respuesta aquí..."
                          className={`text-sm md:text-base w-full ${
                            showFeedback
                              ? isAnswerCorrect
                                ? "bg-green-100 border-green-500 dark:bg-green-900/20"
                                : "bg-red-100 border-red-500 dark:bg-red-900/20"
                              : ""
                          }`}
                          disabled={showFeedback}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !showFeedback) {
                              handleShortAnswer();
                            }
                          }}
                        />
                        {showFeedback && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isAnswerCorrect ? (
                              <Check className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                            ) : (
                              <X className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
                            )}
                          </div>
                        )}
                      </div>
                      
                      {!showFeedback && (
                        <Button 
                          onClick={handleShortAnswer}
                          disabled={!shortAnswerText.trim()}
                          className="w-full"
                        >
                          Enviar respuesta
                        </Button>
                      )}

                      {showFeedback && !isAnswerCorrect && (
                        <div className="p-3 bg-muted rounded-lg w-full break-words">
                          <p className="text-xs md:text-sm font-semibold mb-1">Respuesta correcta:</p>
                          <p className="text-xs md:text-sm break-words">{currentQ.quiz_options[0]?.option_text}</p>
                        </div>
                      )}
                    </div>
                   )}

                  {/* Feedback */}
                  {showFeedback && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 md:p-4 rounded-lg text-sm md:text-base break-words w-full ${
                        isAnswerCorrect 
                          ? "bg-green-100 dark:bg-green-900/20" 
                          : "bg-red-100 dark:bg-red-900/20"
                      }`}
                    >
                      {isAnswerCorrect && currentQ.feedback_correct && (
                        <p className="break-words">{currentQ.feedback_correct}</p>
                      )}
                      {!isAnswerCorrect && currentQ.feedback_incorrect && (
                        <p className="break-words">{currentQ.feedback_incorrect}</p>
                      )}
                      {!currentQ.feedback_correct && !currentQ.feedback_incorrect && currentQ.feedback && (
                        <p className="break-words">{currentQ.feedback}</p>
                      )}
                    </motion.div>
                  )}
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex justify-between items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                  className="text-xs md:text-sm flex-shrink-0"
                >
                  <ChevronLeft className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                  Anterior
                </Button>

                <div className="text-xs md:text-sm font-semibold flex-shrink-0">
                  {normalizedScore} / 100
                </div>

                <Button 
                  size="sm"
                  onClick={handleNext} 
                  disabled={!showFeedback}
                  className="text-xs md:text-sm flex-shrink-0"
                >
                  {currentQuestion === questions.length - 1 ? "Finalizar" : "Siguiente"}
                  {currentQuestion < questions.length - 1 && (
                    <ChevronRight className="h-3 w-3 md:h-4 md:w-4 ml-1" />
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
