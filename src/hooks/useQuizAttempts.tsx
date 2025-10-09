import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useQuizAttempts = (quizId?: string) => {
  const { user } = useAuth();

  const { data: lastAttempt, isLoading } = useQuery({
    queryKey: ["quiz-attempts", quizId, user?.id],
    queryFn: async () => {
      if (!quizId || !user) return null;

      const { data, error } = await supabase
        .from("user_quiz_results")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!quizId && !!user,
  });

  return {
    lastAttempt,
    hasAttempted: !!lastAttempt,
    isLoading,
  };
};
