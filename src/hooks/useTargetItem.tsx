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
          .single();

        if (error) throw error;
        return data as any;
      }

      if (gameId) {
        const { data: gameData, error: gameError } = await supabase
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
          .single();

        if (gameError) throw gameError;

        // Get question count for the game
        const { data: questionsData } = await supabase
          .from("game_questions")
          .select("game_id")
          .eq("game_id", gameId);

        const questionCount = questionsData?.length || 0;

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
          questions_count: questionCount,
        } as any;
      }

      // quizId path
      const { data: quizData, error: quizError } = await supabase
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
        // No status filter to avoid missing items due to naming
        .single();

      if (quizError) throw quizError;

      // Enrich minimal stats for target quiz
      const [{ data: questionsData }, { data: likesData }, { data: commentsData }] = await Promise.all([
        supabase.from("quiz_questions").select("content_id").eq("content_id", quizId as string),
        supabase.from("likes").select("quiz_id").eq("quiz_id", quizId as string),
        supabase.from("comments").select("quiz_id").eq("quiz_id", quizId as string),
      ]);

      const questionCount = questionsData?.length || 0;
      const likeCount = likesData?.length || 0;
      const commentCount = commentsData?.length || 0;

      return {
        ...quizData,
        content_type: "quiz" as const,
        likes_count: likeCount,
        views_count: 0,
        saves_count: 0,
        shares_count: 0,
        comments_count: commentCount,
        video_url: null,
        document_url: null,
        rich_text: null,
        tags: quizData.tags || [],
        questions_count: questionCount,
      } as any;
    },
    enabled: !!(contentId || quizId || gameId),
  });
};