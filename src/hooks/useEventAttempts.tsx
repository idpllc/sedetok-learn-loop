import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useEventAttempts = (eventId?: string) => {
  const { user } = useAuth();

  const { data: attempts, isLoading } = useQuery({
    queryKey: ["event-attempts", eventId, user?.id],
    queryFn: async () => {
      if (!eventId || !user) return [];

      const { data, error } = await supabase
        .from("user_quiz_results")
        .select("*")
        .eq("evaluation_event_id", eventId)
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!eventId && !!user,
  });

  return {
    attempts,
    hasAttempted: (attempts?.length || 0) > 0,
    attemptCount: attempts?.length || 0,
    lastAttempt: attempts?.[0] || null,
    isLoading,
  };
};
