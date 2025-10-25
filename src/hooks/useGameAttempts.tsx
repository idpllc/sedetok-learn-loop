import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useGameAttempts = (gameId?: string, eventId?: string) => {
  const { user } = useAuth();

  const { data: attempts, isLoading } = useQuery({
    queryKey: ["game-attempts", gameId, eventId, user?.id],
    queryFn: async () => {
      if ((!gameId && !eventId) || !user) return [];

      let query = supabase
        .from("user_quiz_results")
        .select("*")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });

      if (eventId) {
        query = query.eq("evaluation_event_id", eventId);
      } else if (gameId) {
        query = query.eq("game_id", gameId).is("evaluation_event_id", null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: (!!gameId || !!eventId) && !!user,
  });

  return {
    attempts,
    hasAttempted: (attempts?.length || 0) > 0,
    attemptCount: attempts?.length || 0,
    lastAttempt: attempts?.[0] || null,
    isLoading,
  };
};
