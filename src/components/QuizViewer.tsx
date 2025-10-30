import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Check, X, Clock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEducoins } from "@/hooks/useEducoins";
import { useXP } from "@/hooks/useXP";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BuyEducoinsModal } from "@/components/BuyEducoinsModal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CustomAudioPlayer } from "@/components/quiz/CustomAudioPlayer";

interface QuizViewerProps {
  quizId: string;
  lastAttempt?: any;
  onComplete?: () => void;
  onQuizComplete?: (passed: boolean) => void;
  evaluationEventId?: string;
  showResultsImmediately?: boolean;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  image_url?: string;
  video_url?: string;
  audio_url?: string;
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

export const QuizViewer = ({ quizId, lastAttempt, onComplete, onQuizComplete, evaluationEventId, showResultsImmediately = true }: QuizViewerProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { deductEducoins, showBuyModal, requiredAmount, closeBuyModal } = useEducoins();
  const { deductXP } = useXP();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizSubject, setQuizSubject] = useState<string | null>(null);
  const [quizTimeLimit, setQuizTimeLimit] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [shortAnswerText, setShortAnswerText] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean>(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState<Record<number, boolean>>({});
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'previous' | 'showAnswers' | 'extendTime', educoinCost: number, xpCost: number } | null>(null);
  const [questionResults, setQuestionResults] = useState<Record<number, boolean>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsTabVisible(false);
        setTabSwitchCount(prev => prev + 1);
        if (tabSwitchCount >= 2) {
          toast.warning("Cambios de pestaña detectados", {
            description: "Se ha registrado actividad sospechosa durante el quiz."
          });
        }
      } else {
        setIsTabVisible(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [tabSwitchCount]);

  // Prevent copy/paste
  useEffect(() => {
    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.error("Copiar no está permitido durante el quiz");
    };

    const preventPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.error("Pegar no está permitido durante el quiz");
    };

    document.addEventListener("copy", preventCopy);
    document.addEventListener("paste", preventPaste);
    document.addEventListener("cut", preventCopy);

    return () => {
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("paste", preventPaste);
      document.removeEventListener("cut", preventCopy);
    };
  }, []);
  
  useEffect(() => {
    fetchQuizData();
  }, [quizId]);

  // Timer - only counts when tab is visible
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0 && timerActive && !isCompleted) {
      if (isTabVisible) {
        timerRef.current = setInterval(() => {
          setTimeRemaining(prev => {
            if (prev === null || prev <= 1) {
              setTimerActive(false);
              toast.error("¡Tiempo agotado!");
              completeQuiz();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [timeRemaining, timerActive, isCompleted, isTabVisible]);

  const fetchQuizData = async () => {
    try {
      // Fetch quiz info to get subject and time limit
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("subject, category, time_limit")
        .eq("id", quizId)
        .maybeSingle();

      if (quizError) throw quizError;
      setQuizSubject(quizData?.subject || quizData?.category || null);
      
      // Set time limit if exists
      if (quizData?.time_limit) {
        setQuizTimeLimit(quizData.time_limit);
        setTimeRemaining(quizData.time_limit * 60); // Convert minutes to seconds
        setTimerActive(true);
      }

      // Fetch questions
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*, quiz_options(*)")
        .eq("content_id", quizId)
        .order("order_index", { ascending: true });

      if (error) throw error;

      setQuestions(data as Question[]);
      // Initialize start time when quiz is loaded and ready
      setStartTime(Date.now());
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

    const correct = selectedOption?.is_correct || false;
    setQuestionResults({ ...questionResults, [currentQuestion]: correct });

    if (correct) {
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
    setQuestionResults({ ...questionResults, [currentQuestion]: isCorrect });
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
      // Don't reset showCorrectAnswers - each question maintains its own state
    } else {
      completeQuiz();
    }
  };

  const executePreviousAction = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(null);
      setShortAnswerText("");
      setShowFeedback(false);
      setIsAnswerCorrect(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setPendingAction({ type: 'previous', educoinCost: 1, xpCost: 300 });
      setPaymentDialogOpen(true);
    }
  };

  const executeShowAnswers = () => {
    setShowCorrectAnswers({ ...showCorrectAnswers, [currentQuestion]: true });
  };

  const handleShowAnswers = () => {
    setPendingAction({ type: 'showAnswers', educoinCost: 1, xpCost: 500 });
    setPaymentDialogOpen(true);
  };

  const executeExtendTime = () => {
    setTimeRemaining(prev => (prev || 0) + 60);
    toast.success("¡Tiempo extendido!");
  };

  const handleExtendTime = () => {
    setPendingAction({ type: 'extendTime', educoinCost: 1, xpCost: 200 });
    setPaymentDialogOpen(true);
  };

  const handlePayWithEducoins = async () => {
    if (!pendingAction) return;
    
    const success = await deductEducoins(pendingAction.educoinCost, getActionDescription(pendingAction.type));
    if (success) {
      executeAction(pendingAction.type);
      setPaymentDialogOpen(false);
      setPendingAction(null);
    }
  };

  const handlePayWithXP = async () => {
    if (!pendingAction) return;
    
    const success = await deductXP(pendingAction.xpCost, getActionDescription(pendingAction.type), quizId);
    if (success) {
      executeAction(pendingAction.type);
      setPaymentDialogOpen(false);
      setPendingAction(null);
    }
  };

  const executeAction = (actionType: 'previous' | 'showAnswers' | 'extendTime') => {
    switch (actionType) {
      case 'previous':
        executePreviousAction();
        break;
      case 'showAnswers':
        executeShowAnswers();
        break;
      case 'extendTime':
        executeExtendTime();
        break;
    }
  };

  const getActionDescription = (actionType: 'previous' | 'showAnswers' | 'extendTime') => {
    switch (actionType) {
      case 'previous':
        return 'Retroceder pregunta';
      case 'showAnswers':
        return 'Ver respuestas correctas';
      case 'extendTime':
        return 'Extender tiempo +1 minuto';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const completeQuiz = async () => {
    setIsCompleted(true);

    if (!user) {
      console.error("No user logged in");
      toast.error("Debes iniciar sesión para guardar tus resultados");
      // Don't call onComplete here - let user close manually
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

      // Calculate time taken in seconds
      const timeTaken = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

      const payload: any = {
        user_id: user.id,
        quiz_id: quizId,
        score: normalizedScore,
        max_score: 100,
        passed,
        time_taken: timeTaken,
      };

      // Add evaluation event ID if present
      if (evaluationEventId) {
        payload.evaluation_event_id = evaluationEventId;
      }

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

    // Don't call onComplete here - let user close manually via button
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
    if (!showResultsImmediately) {
      return (
        <div className="h-full flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 md:p-8 text-center space-y-6">
              <div className="text-6xl">✅</div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Quiz Enviado</h3>
                <p className="text-muted-foreground">
                  Tu evaluación ha sido enviada correctamente. Los resultados serán compartidos por tu profesor.
                </p>
              </div>
              <Button onClick={onComplete} size="lg" className="w-full">
                Cerrar
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    
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
            <Button onClick={onComplete} size="lg" className="w-full">
              Cerrar
            </Button>
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
              {/* Alerts for tab visibility and suspicious activity */}
              {!isTabVisible && (
                <Alert className="border-warning">
                  <EyeOff className="h-4 w-4" />
                  <AlertDescription>
                    El temporizador está pausado. Vuelve a esta pestaña para continuar el quiz.
                  </AlertDescription>
                </Alert>
              )}
              
              {tabSwitchCount >= 3 && (
                <Alert className="border-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Se han detectado múltiples cambios de pestaña. Esta actividad ha sido registrada.
                  </AlertDescription>
                </Alert>
              )}

              {/* Timer and controls */}
              {timeRemaining !== null && (
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Clock className="h-4 w-4" />
                    <span className={timeRemaining < 60 ? "text-red-500" : ""}>
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExtendTime}
                    className="text-xs"
                  >
                    +1 min
                  </Button>
                </div>
              )}

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
                  <div 
                    className="prose prose-sm max-w-none text-base md:text-xl font-bold leading-tight break-words"
                    dangerouslySetInnerHTML={{ __html: currentQ.question_text }}
                  />

                  {currentQ.image_url && (
                    <img
                      src={currentQ.image_url}
                      alt="Question"
                      className="w-full rounded-lg max-h-80 object-contain"
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

                  {currentQ.audio_url && (
                    <CustomAudioPlayer 
                      audioUrl={currentQ.audio_url}
                      title={quizSubject || "Audio de la pregunta"}
                    />
                  )}

                   {/* Options for multiple choice and true/false */}
                   {(currentQ.question_type === "multiple_choice" || currentQ.question_type === "true_false") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                      {currentQ.quiz_options
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((option, index) => {
                          const isSelected = selectedAnswer === option.id;
                          const isCorrect = option.is_correct;
                          const showResult = showFeedback && isSelected;
                          const showAsCorrect = showCorrectAnswers[currentQuestion] && isCorrect;
                          
                          // Array de colores vibrantes para estudiantes
                          const colors = [
                            'bg-gradient-to-r from-blue-400/20 to-blue-500/20 border-blue-400 hover:from-blue-400/30 hover:to-blue-500/30',
                            'bg-gradient-to-r from-purple-400/20 to-purple-500/20 border-purple-400 hover:from-purple-400/30 hover:to-purple-500/30',
                            'bg-gradient-to-r from-pink-400/20 to-pink-500/20 border-pink-400 hover:from-pink-400/30 hover:to-pink-500/30',
                            'bg-gradient-to-r from-orange-400/20 to-orange-500/20 border-orange-400 hover:from-orange-400/30 hover:to-orange-500/30',
                            'bg-gradient-to-r from-teal-400/20 to-teal-500/20 border-teal-400 hover:from-teal-400/30 hover:to-teal-500/30',
                          ];
                          const colorClass = !showFeedback && !showCorrectAnswers ? colors[index % colors.length] : '';

                           return (
                            <Button
                              key={option.id}
                              variant="outline"
                              className={`w-full justify-start text-left h-auto min-h-[80px] p-3 md:p-4 text-sm md:text-base break-words whitespace-normal ${
                                showAsCorrect
                                  ? "bg-green-100 border-green-500 dark:bg-green-900/20"
                                  : showResult
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
                              <div className="flex-1 space-y-2 flex flex-col">
                                <span className="block break-words">{option.option_text}</span>
                                
                                {option.image_url && (
                                  <img 
                                    src={option.image_url} 
                                    alt="Option" 
                                    className="w-full max-h-32 object-contain rounded"
                                  />
                                )}
                                
                                {option.video_url && (
                                  <div className="aspect-video w-full">
                                    <iframe
                                      src={option.video_url.replace("watch?v=", "embed/")}
                                      className="w-full h-full rounded"
                                      allowFullScreen
                                    />
                                  </div>
                                )}
                              </div>
                              
                              {(showResult || showAsCorrect) && (
                                <span className="ml-2 flex-shrink-0 self-start">
                                  {(isCorrect || showAsCorrect) ? (
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

              {/* Show answers button - only when failed and hasn't paid yet */}
              {showFeedback && !isAnswerCorrect && !showCorrectAnswers[currentQuestion] && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShowAnswers}
                    className="text-xs md:text-sm"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver respuestas
                  </Button>
                </div>
              )}

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

      {/* Payment Dialog */}
      <AlertDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Selecciona tu método de pago</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction && (
                <span>
                  Para {getActionDescription(pendingAction.type).toLowerCase()}, elige cómo pagar:
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4"
              onClick={handlePayWithEducoins}
            >
              <span className="text-2xl mb-2">💰</span>
              <span className="font-semibold">{pendingAction?.educoinCost} Educoin{(pendingAction?.educoinCost || 0) > 1 ? 's' : ''}</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4"
              onClick={handlePayWithXP}
            >
              <span className="text-2xl mb-2">⭐</span>
              <span className="font-semibold">{pendingAction?.xpCost} XP</span>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BuyEducoinsModal
        open={showBuyModal}
        onOpenChange={closeBuyModal}
        requiredAmount={requiredAmount}
      />
    </div>
  );
};
