import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export const useUserContent = (userId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: userContent, isLoading } = useQuery({
    queryKey: ["userContent", userId],
    queryFn: async () => {
      const targetUserId = userId;
      if (!targetUserId) return [];

      const isOwnContent = user?.id === targetUserId;

      // Fetch content, quizzes, and games in parallel
      const [contentResult, quizResult, gameResult] = await Promise.all([
        (() => {
          let q = supabase
            .from("content")
            .select(`*, profiles:creator_id (username, avatar_url, institution)`)
            .eq("creator_id", targetUserId);
          if (!isOwnContent) q = q.eq("is_public", true);
          return q.order("created_at", { ascending: false });
        })(),
        (() => {
          let q = supabase
            .from("quizzes")
            .select(`*, profiles:creator_id (username, avatar_url, institution)`)
            .eq("creator_id", targetUserId);
          if (!isOwnContent) q = q.eq("is_public", true);
          return q.order("created_at", { ascending: false });
        })(),
        (() => {
          let q = supabase
            .from("games")
            .select(`*, profiles:creator_id (username, avatar_url, institution)`)
            .eq("creator_id", targetUserId);
          if (!isOwnContent) q = q.eq("is_public", true);
          return q.order("created_at", { ascending: false });
        })()
      ]);

      if (contentResult.error) throw contentResult.error;
      if (quizResult.error) throw quizResult.error;
      if (gameResult.error) throw gameResult.error;

      const quizzes = (quizResult.data || []).map(quiz => ({
        ...quiz,
        content_type: 'quiz' as const,
        likes_count: 0, views_count: 0, saves_count: 0, shares_count: 0, comments_count: 0,
        tags: quiz.tags || [],
      }));

      const games = (gameResult.data || []).map(game => ({
        ...game,
        content_type: 'game' as const,
        likes_count: 0, views_count: 0, saves_count: 0, shares_count: 0, comments_count: 0,
        tags: game.tags || [],
      }));

      return [...(contentResult.data || []), ...quizzes, ...games].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const content = userContent?.find(c => c.id === contentId);
      
      if (content?.content_type === 'quiz') {
        const { error } = await supabase.from("quizzes").delete().eq("id", contentId);
        if (error) throw error;
      } else if (content?.content_type === 'game') {
        const { error } = await supabase.from("games").delete().eq("id", contentId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("content").delete().eq("id", contentId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userContent"] });
      toast({ title: "Contenido eliminado", description: "El contenido ha sido eliminado exitosamente" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ contentId, updates }: { contentId: string; updates: { title?: string; description?: string; is_public?: boolean; tags?: string[]; video_url?: string; document_url?: string; thumbnail_url?: string; } }) => {
      const { error } = await supabase.from("content").update(updates).eq("id", contentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userContent"] });
      toast({ title: "Contenido actualizado", description: "Los cambios se guardaron correctamente" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return { userContent, isLoading, deleteMutation, updateMutation };
};