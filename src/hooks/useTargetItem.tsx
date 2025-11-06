import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useTargetItem = (contentId?: string, quizId?: string, gameId?: string) => {
  return useQuery({
    queryKey: ["target-item", contentId, quizId, gameId],
    queryFn: async () => {
      if (!contentId && !quizId && !gameId) return null;

      if (contentId) {
        const { data, error } = await supabase
          .from("content")
          .select(`
            *,
            profiles:creator_id (
              username,
              full_name,
              avatar_url,
              institution,
              is_verified
            )
          `)
          .eq("id", contentId)
          .eq("is_public", true)
          .maybeSingle();

        if (error) throw error;
        return data as any;
      }

      if (gameId) {
        // Parallel queries for better performance
        const [
          { data: gameData, error: gameError },
          { count: questionCount }
        ] = await Promise.all([
          supabase
            .from("games")
            .select(`
              *,
              profiles:creator_id (
                username,
                full_name,
                avatar_url,
                institution,
                is_verified
              )
            `)
            .eq("id", gameId)
            .eq("is_public", true)
            .maybeSingle(),
          supabase
            .from("game_questions")
            .select("*", { count: 'exact', head: true })
            .eq("game_id", gameId)
        ]);

        if (gameError) throw gameError;
        if (!gameData) return null;

        return {
          ...gameData,
          content_type: "game" as const,
          likes_count: 0,
          views_count: 0,
          saves_count: 0,
          shares_count: 0,
          comments_count: 0,
          video_url: null,
          document_url: null,
          rich_text: null,
          tags: gameData.tags || [],
          questions_count: questionCount || 0,
        } as any;
      }

      // quizId path - all queries in parallel
      const [
        { data: quizData, error: quizError },
        { count: questionCount },
        { count: likeCount },
        { count: commentCount }
      ] = await Promise.all([
        supabase
          .from("quizzes")
          .select(`
            *,
            profiles:creator_id (
              username,
              full_name,
              avatar_url,
              institution,
              is_verified
            )
          `)
          .eq("id", quizId)
          .eq("is_public", true)
          .maybeSingle(),
        supabase
          .from("quiz_questions")
          .select("*", { count: 'exact', head: true })
          .eq("content_id", quizId as string),
        supabase
          .from("likes")
          .select("*", { count: 'exact', head: true })
          .eq("quiz_id", quizId as string),
        supabase
          .from("comments")
          .select("*", { count: 'exact', head: true })
          .eq("quiz_id", quizId as string)
      ]);

      if (quizError) throw quizError;
      if (!quizData) return null;

      return {
        ...quizData,
        content_type: "quiz" as const,
        likes_count: likeCount || 0,
        views_count: 0,
        saves_count: 0,
        shares_count: 0,
        comments_count: commentCount || 0,
        video_url: null,
        document_url: null,
        rich_text: null,
        tags: quizData.tags || [],
        questions_count: questionCount || 0,
      } as any;
    },
    enabled: !!(contentId || quizId || gameId),
  });
};