import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type Quiz = Database["public"]["Tables"]["quizzes"]["Row"];
type QuizInsert = Database["public"]["Tables"]["quizzes"]["Insert"];
type Question = Database["public"]["Tables"]["quiz_questions"]["Row"];
type QuestionInsert = Database["public"]["Tables"]["quiz_questions"]["Insert"];
type QuizOption = Database["public"]["Tables"]["quiz_options"]["Row"];
type QuizOptionInsert = Database["public"]["Tables"]["quiz_options"]["Insert"];

export const useQuizzes = (creatorId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: quizzes, isLoading } = useQuery({
    queryKey: ["quizzes", creatorId],
    queryFn: async () => {
      let query = supabase
        .from("quizzes")
        .select("*")
        .order("created_at", { ascending: false });

      if (creatorId) {
        query = query.eq("creator_id", creatorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Quiz[];
    },
  });

  const createQuiz = useMutation({
    mutationFn: async (quiz: QuizInsert) => {
      const { data, error } = await supabase
        .from("quizzes")
        .insert(quiz)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      toast({
        title: "Quiz creado",
        description: "El quiz ha sido creado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateQuiz = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<QuizInsert> }) => {
      const { data, error } = await supabase
        .from("quizzes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      toast({
        title: "Quiz actualizado",
        description: "El quiz ha sido actualizado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteQuiz = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      toast({
        title: "Quiz eliminado",
        description: "El quiz ha sido eliminado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    quizzes,
    isLoading,
    createQuiz,
    updateQuiz,
    deleteQuiz,
  };
};

export const useQuizQuestions = (quizId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: questions, isLoading } = useQuery({
    queryKey: ["quiz-questions", quizId],
    queryFn: async () => {
      if (!quizId) return [];

      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*, quiz_options(*)")
        .eq("content_id", quizId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      
      // Parse options from quiz_options table to array format expected by the UI
      return data.map((question: any) => ({
        id: question.id,
        question_type: question.question_type,
        question_text: question.question_text,
        image_url: question.image_url,
        video_url: question.video_url,
        feedback: question.feedback,
        feedback_correct: question.feedback_correct,
        feedback_incorrect: question.feedback_incorrect,
        comparison_mode: question.comparison_mode,
        points: question.points,
        options: question.quiz_options 
          ? question.quiz_options
              .sort((a: any, b: any) => a.order_index - b.order_index)
              .map((opt: any) => ({
                id: opt.id,
                option_text: opt.option_text,
                is_correct: opt.is_correct,
                order_index: opt.order_index
              }))
          : []
      }));
    },
    enabled: !!quizId,
  });

  const createQuestion = useMutation({
    mutationFn: async (question: QuestionInsert & { options?: QuizOptionInsert[] }) => {
      const { options, ...questionData } = question;
      
      const { data: newQuestion, error: questionError } = await supabase
        .from("quiz_questions")
        .insert({
          ...questionData,
          options: {} as any, // Required field but will use quiz_options table
          feedback_correct: questionData.feedback_correct,
          feedback_incorrect: questionData.feedback_incorrect,
          comparison_mode: questionData.comparison_mode,
        })
        .select()
        .single();

      if (questionError) throw questionError;

      if (options && options.length > 0) {
        const optionsWithQuestionId = options.map(opt => ({
          ...opt,
          question_id: newQuestion.id,
        }));

        const { error: optionsError } = await supabase
          .from("quiz_options")
          .insert(optionsWithQuestionId);

        if (optionsError) throw optionsError;
      }

      return newQuestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions"] });
    },
  });

  return {
    questions,
    isLoading,
    createQuestion,
    deleteQuestion,
  };
};
