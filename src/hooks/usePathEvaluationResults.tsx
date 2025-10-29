import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PathEvaluationResult {
  id: string;
  user_id: string;
  path_id: string;
  evaluation_event_id: string;
  total_items: number;
  completed_items: number;
  completion_percentage: number;
  passed: boolean;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

export const usePathEvaluationResults = (eventId?: string) => {
  const { data: results, isLoading } = useQuery({
    queryKey: ["path-evaluation-results", eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from("user_path_results")
        .select(`
          *,
          profiles!user_path_results_user_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("evaluation_event_id", eventId)
        .order("completed_at", { ascending: false, nullsFirst: false })
        .order("started_at", { ascending: false });

      if (error) throw error;
      return data as unknown as PathEvaluationResult[];
    },
    enabled: !!eventId,
  });

  return {
    results,
    isLoading,
  };
};
