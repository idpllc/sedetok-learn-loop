import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";

export const usePathProgress = (pathId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { awardPathCompletionXP } = useXP();

  const { data: progress, isLoading } = useQuery({
    queryKey: ["path-progress", pathId, user?.id],
    queryFn: async () => {
      if (!pathId || !user) return [];

      const { data, error } = await supabase
        .from("user_path_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("path_id", pathId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!pathId && !!user,
  });

  const markComplete = useMutation({
    mutationFn: async ({
      contentId,
      quizId,
      progressData,
    }: {
      contentId?: string;
      quizId?: string;
      progressData?: any;
    }) => {
      if (!user || !pathId) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase
        .from("user_path_progress")
        .upsert({
          user_id: user.id,
          path_id: pathId,
          content_id: contentId || null,
          quiz_id: quizId || null,
          completed: true,
          completed_at: new Date().toISOString(),
          progress_data: progressData || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["path-progress", pathId, user?.id] });
      
      // Check if path is complete and award XP
      if (pathId) {
        await awardPathCompletionXP(pathId);
      }
    },
  });

  const updateProgress = useMutation({
    mutationFn: async ({
      contentId,
      quizId,
      progressData,
      completed,
    }: {
      contentId?: string;
      quizId?: string;
      progressData: any;
      completed?: boolean;
    }) => {
      if (!user || !pathId) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase
        .from("user_path_progress")
        .upsert({
          user_id: user.id,
          path_id: pathId,
          content_id: contentId || null,
          quiz_id: quizId || null,
          completed: completed || false,
          completed_at: completed ? new Date().toISOString() : null,
          progress_data: progressData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["path-progress", pathId, user?.id] });
      
      // Check if path is complete and award XP
      if (pathId) {
        await awardPathCompletionXP(pathId);
      }
    },
  });

  const getCompletedIds = (): Set<string> => {
    if (!progress) return new Set();
    
    return new Set(
      progress
        .filter((p) => p.completed)
        .map((p) => p.content_id || p.quiz_id)
        .filter(Boolean) as string[]
    );
  };

  const isCompleted = (contentId?: string, quizId?: string): boolean => {
    if (!progress) return false;
    
    return progress.some(
      (p) =>
        p.completed &&
        ((contentId && p.content_id === contentId) ||
          (quizId && p.quiz_id === quizId))
    );
  };

  const getProgressData = (contentId?: string, quizId?: string): any => {
    if (!progress) return null;
    
    const item = progress.find(
      (p) =>
        (contentId && p.content_id === contentId) ||
        (quizId && p.quiz_id === quizId)
    );
    
    return item?.progress_data || null;
  };

  return {
    progress,
    isLoading,
    markComplete,
    updateProgress,
    getCompletedIds,
    isCompleted,
    getProgressData,
  };
};
