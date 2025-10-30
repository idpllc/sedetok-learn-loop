import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface UserResponsesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  quizId?: string;
  gameId?: string;
  eventId: string;
}

export const UserResponsesDialog = ({
  open,
  onOpenChange,
  userId,
  quizId,
  gameId,
  eventId,
}: UserResponsesDialogProps) => {
  const { data: quizDetails, isLoading: quizLoading } = useQuery({
    queryKey: ["quiz-details", quizId],
    queryFn: async () => {
      if (!quizId) return null;
      const { data, error } = await supabase
        .from("quizzes")
        .select(`
          *,
          quiz_questions (
            id,
            question_text,
            question_type,
            points,
            order_index,
            quiz_options (
              id,
              option_text,
              is_correct
            )
          )
        `)
        .eq("id", quizId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!quizId && open,
  });

  const { data: userResult, isLoading: resultLoading } = useQuery({
    queryKey: ["user-quiz-result", userId, eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_quiz_results")
        .select("*")
        .eq("user_id", userId)
        .eq("evaluation_event_id", eventId)
        .order("completed_at", { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!userId && !!eventId,
  });

  const { data: openResponses, isLoading: openLoading } = useQuery({
    queryKey: ["user-open-responses", userId, quizId, eventId],
    queryFn: async () => {
      if (!quizId) return [];
      const { data, error } = await supabase
        .from("user_open_responses")
        .select("*")
        .eq("user_id", userId)
        .eq("quiz_id", quizId)
        .eq("evaluation_event_id", eventId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!quizId && open,
  });

  const isLoading = quizLoading || resultLoading || openLoading;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cargando respuestas...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const userAnswers = (userResult as any)?.answers as Record<string, any> || {};
  const sortedQuestions = quizDetails?.quiz_questions?.sort((a, b) => a.order_index - b.order_index) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Respuestas del Usuario</DialogTitle>
        </DialogHeader>

        {userResult && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Puntaje:</span>
                <Badge variant={userResult.passed ? "default" : "destructive"}>
                  {userResult.score} / {userResult.max_score} ({((userResult.score / userResult.max_score) * 100).toFixed(0)}%)
                </Badge>
              </div>
              {userResult.time_taken && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tiempo:</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{Math.round(userResult.time_taken / 60)} minutos</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {sortedQuestions.map((question, index) => {
            const userAnswer = userAnswers[question.id];
            const openResponse = openResponses?.find((r) => r.question_id === question.id);

            return (
              <Card key={question.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">
                      {index + 1}. {question.question_text}
                    </CardTitle>
                    <Badge variant={question.question_type === "open_ended" ? "secondary" : "outline"}>
                      {question.question_type === "multiple_choice" && "Opción múltiple"}
                      {question.question_type === "true_false" && "Verdadero/Falso"}
                      {question.question_type === "open_ended" && "Respuesta abierta"}
                      {question.question_type === "short_answer" && "Respuesta corta"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(question.question_type === "open_ended" || question.question_type === "short_answer") && openResponse ? (
                    <div className="space-y-2">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm font-medium mb-1">Respuesta del estudiante:</p>
                        <p className="text-sm">{openResponse.response_text}</p>
                      </div>
                      {openResponse.ai_score !== null && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Calificación IA:</span>
                          <Badge variant={openResponse.ai_score >= 70 ? "default" : "destructive"}>
                            {openResponse.ai_score.toFixed(0)} / 100
                          </Badge>
                        </div>
                      )}
                      {openResponse.ai_feedback && (
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                          <p className="text-sm font-medium mb-1">Retroalimentación IA:</p>
                          <p className="text-sm">{openResponse.ai_feedback}</p>
                        </div>
                      )}
                      {openResponse.teacher_score !== null && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Calificación docente:</span>
                          <Badge variant="default">
                            {openResponse.teacher_score.toFixed(0)} / 100
                          </Badge>
                        </div>
                      )}
                      {openResponse.teacher_feedback && (
                        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                          <p className="text-sm font-medium mb-1">Retroalimentación docente:</p>
                          <p className="text-sm">{openResponse.teacher_feedback}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {question.quiz_options?.map((option, optIndex) => {
                        const isSelected = userAnswer?.selectedOption === optIndex;
                        const isCorrect = option.is_correct;

                        return (
                          <div
                            key={option.id}
                            className={`p-3 rounded-lg border ${
                              isSelected && isCorrect
                                ? "bg-green-50 dark:bg-green-950/20 border-green-500"
                                : isSelected && !isCorrect
                                ? "bg-red-50 dark:bg-red-950/20 border-red-500"
                                : isCorrect
                                ? "bg-green-50/50 dark:bg-green-950/10 border-green-300"
                                : "bg-muted"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm">{option.option_text}</p>
                              {isSelected && (
                                isCorrect ? (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-600" />
                                )
                              )}
                              {!isSelected && isCorrect && (
                                <span className="text-xs text-green-600 font-medium">Correcta</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Puntos:</span>
                    <Badge variant="outline">{question.points}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
