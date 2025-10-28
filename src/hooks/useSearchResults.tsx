import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSearchResults = (itemIds?: string[], itemTypes?: string[]) => {
  return useQuery({
    queryKey: ["search-results", itemIds, itemTypes],
    queryFn: async () => {
      if (!itemIds || !itemTypes || itemIds.length === 0) return null;

      const results: any[] = [];

      // Group IDs by type for efficient querying
      const contentIds = itemIds.filter((_, i) => itemTypes[i] === 'content');
      const quizIds = itemIds.filter((_, i) => itemTypes[i] === 'quiz');
      const gameIds = itemIds.filter((_, i) => itemTypes[i] === 'game');

      // Fetch content
      if (contentIds.length > 0) {
        const { data: contentData, error: contentError } = await supabase
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
          .in("id", contentIds)
          .eq("is_public", true);

        if (contentError) throw contentError;
        if (contentData) results.push(...contentData);
      }

      // Fetch quizzes
      if (quizIds.length > 0) {
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
          .in("id", quizIds)
          .eq("is_public", true);

        if (quizError) throw quizError;

        // Get question counts, likes, and comments for quizzes
        if (quizData && quizData.length > 0) {
          const questionCounts: Record<string, number> = {};
          const likeCounts: Record<string, number> = {};
          const commentCounts: Record<string, number> = {};

          const { data: questionsData } = await supabase
            .from("quiz_questions")
            .select("content_id")
            .in("content_id", quizIds);

          if (questionsData) {
            questionsData.forEach((q) => {
              questionCounts[q.content_id] = (questionCounts[q.content_id] || 0) + 1;
            });
          }

          const { data: likesData } = await supabase
            .from("likes")
            .select("quiz_id")
            .in("quiz_id", quizIds)
            .not("quiz_id", "is", null);

          if (likesData) {
            likesData.forEach((like) => {
              if (like.quiz_id) {
                likeCounts[like.quiz_id] = (likeCounts[like.quiz_id] || 0) + 1;
              }
            });
          }

          const { data: commentsData } = await supabase
            .from("comments")
            .select("quiz_id")
            .in("quiz_id", quizIds)
            .not("quiz_id", "is", null);

          if (commentsData) {
            commentsData.forEach((comment) => {
              if (comment.quiz_id) {
                commentCounts[comment.quiz_id] = (commentCounts[comment.quiz_id] || 0) + 1;
              }
            });
          }

          const transformedQuizzes = quizData.map(quiz => ({
            ...quiz,
            content_type: 'quiz' as const,
            likes_count: likeCounts[quiz.id] || 0,
            views_count: 0,
            saves_count: 0,
            shares_count: 0,
            comments_count: commentCounts[quiz.id] || 0,
            video_url: null,
            document_url: null,
            rich_text: null,
            tags: quiz.tags || [],
            questions_count: questionCounts[quiz.id] || 0,
          }));

          results.push(...transformedQuizzes);
        }
      }

      // Fetch games
      if (gameIds.length > 0) {
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
          .in("id", gameIds)
          .eq("is_public", true);

        if (gameError) throw gameError;

        // Get question counts for games
        if (gameData && gameData.length > 0) {
          const questionCounts: Record<string, number> = {};

          const { data: gameQuestionsData } = await supabase
            .from("game_questions")
            .select("game_id")
            .in("game_id", gameIds);

          if (gameQuestionsData) {
            gameQuestionsData.forEach((q) => {
              questionCounts[q.game_id] = (questionCounts[q.game_id] || 0) + 1;
            });
          }

          const transformedGames = gameData.map(game => ({
            ...game,
            content_type: 'game' as const,
            likes_count: game.likes_count || 0,
            views_count: 0,
            saves_count: game.saves_count || 0,
            shares_count: game.shares_count || 0,
            comments_count: game.comments_count || 0,
            video_url: null,
            document_url: null,
            rich_text: null,
            tags: game.tags || [],
            questions_count: questionCounts[game.id] || 0,
          }));

          results.push(...transformedGames);
        }
      }

      // Sort results to match original order
      const sortedResults = itemIds.map(id => 
        results.find(item => item.id === id)
      ).filter(Boolean);

      return sortedResults;
    },
    enabled: !!(itemIds && itemTypes && itemIds.length > 0),
  });
};
