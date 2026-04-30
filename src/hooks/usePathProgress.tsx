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
      gameId,
      progressData,
    }: {
      contentId?: string;
      quizId?: string;
      gameId?: string;
      progressData?: any;
    }) => {
      if (!user || !pathId) throw new Error("Usuario no autenticado");

      // Check if a row already exists for this exact item to decide insert vs update
      let existingQuery: any = (supabase as any)
        .from("user_path_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("path_id", pathId);
      if (contentId) existingQuery = existingQuery.eq("content_id", contentId).is("quiz_id", null).is("game_id", null);
      else if (quizId) existingQuery = existingQuery.eq("quiz_id", quizId).is("content_id", null).is("game_id", null);
      else if (gameId) existingQuery = existingQuery.eq("game_id", gameId).is("content_id", null).is("quiz_id", null);

      const { data: existing } = await existingQuery.maybeSingle();

      const payload: any = {
        user_id: user.id,
        path_id: pathId,
        content_id: contentId || null,
        quiz_id: quizId || null,
        game_id: gameId || null,
        completed: true,
        completed_at: new Date().toISOString(),
        progress_data: progressData || {},
      };

      const { data, error } = existing
        ? await supabase.from("user_path_progress").update(payload).eq("id", existing.id).select().single()
        : await supabase.from("user_path_progress").insert(payload).select().single();

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
      gameId,
      progressData,
      completed,
    }: {
      contentId?: string;
      quizId?: string;
      gameId?: string;
      progressData: any;
      completed?: boolean;
    }) => {
      if (!user || !pathId) throw new Error("Usuario no autenticado");

      let existingQuery: any = (supabase as any)
        .from("user_path_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("path_id", pathId);
      if (contentId) existingQuery = existingQuery.eq("content_id", contentId).is("quiz_id", null).is("game_id", null);
      else if (quizId) existingQuery = existingQuery.eq("quiz_id", quizId).is("content_id", null).is("game_id", null);
      else if (gameId) existingQuery = existingQuery.eq("game_id", gameId).is("content_id", null).is("quiz_id", null);

      const { data: existing } = await existingQuery.maybeSingle();

      const payload: any = {
        user_id: user.id,
        path_id: pathId,
        content_id: contentId || null,
        quiz_id: quizId || null,
        game_id: gameId || null,
        completed: completed || false,
        completed_at: completed ? new Date().toISOString() : null,
        progress_data: progressData,
      };

      const { data, error } = existing
        ? await supabase.from("user_path_progress").update(payload).eq("id", existing.id).select().single()
        : await supabase.from("user_path_progress").insert(payload).select().single();

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
        .map((p) => p.content_id || p.quiz_id || (p as any).game_id)
        .filter(Boolean) as string[]
    );
  };

  const isCompleted = (contentId?: string, quizId?: string, gameId?: string): boolean => {
    if (!progress) return false;
    
    return progress.some(
      (p) =>
        p.completed &&
        ((contentId && p.content_id === contentId) ||
          (quizId && p.quiz_id === quizId) ||
          (gameId && (p as any).game_id === gameId))
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
