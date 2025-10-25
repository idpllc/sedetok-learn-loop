import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useRelatedContent = (contentId?: string, quizId?: string, gameId?: string) => {
  return useQuery({
    queryKey: ["related-content", contentId, quizId, gameId],
    queryFn: async () => {
      if (!contentId && !quizId && !gameId) return null;

      // First, fetch the target content/quiz/game to get its category
      let targetItem: any = null;
      let category: string | null = null;

      if (contentId) {
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
          .eq("id", contentId)
          .eq("is_public", true)
          .single();

        if (contentError) throw contentError;
        targetItem = contentData;
        category = contentData.category;
      } else if (gameId) {
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

        targetItem = {
          ...gameData,
          content_type: 'game' as const,
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
        };
        category = gameData.category;
      } else if (quizId) {
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
          // Relax status filter to ensure target quiz loads even if status naming varies
          .single();

        if (quizError) throw quizError;
        
        // Get question count for the quiz
        const { data: questionsData } = await supabase
          .from("quiz_questions")
          .select("content_id")
          .eq("content_id", quizId);

        const questionCount = questionsData?.length || 0;

        // Get like count
        const { data: likesData } = await supabase
          .from("likes")
          .select("quiz_id")
          .eq("quiz_id", quizId);

        const likeCount = likesData?.length || 0;

        // Get comment count
        const { data: commentsData } = await supabase
          .from("comments")
          .select("quiz_id")
          .eq("quiz_id", quizId);

        const commentCount = commentsData?.length || 0;

        targetItem = {
          ...quizData,
          content_type: 'quiz' as const,
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
        };
        category = quizData.category;
      }

      if (!category) return [targetItem];

      // Fetch related content from the same category
      const { data: relatedContentData, error: contentError } = await supabase
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
        .eq("is_public", true)
        .eq("category", category as any)
        .neq("id", contentId || "")
        .order("created_at", { ascending: false })
        .limit(10);

      if (contentError) throw contentError;

      // Fetch related quizzes from the same category
      const { data: relatedQuizData, error: quizError } = await supabase
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
        .eq("is_public", true)
        .eq("status", "publicado")
        .eq("category", category as any)
        .neq("id", quizId || "")
        .order("created_at", { ascending: false })
        .limit(10);

      if (quizError) throw quizError;

      // Get question counts and stats for related quizzes
      const quizIds = (relatedQuizData || []).map(q => q.id);
      const questionCounts: Record<string, number> = {};
      const likeCounts: Record<string, number> = {};
      const commentCounts: Record<string, number> = {};
      
      if (quizIds.length > 0) {
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
      }

      // Transform quizzes
      const relatedQuizzes = (relatedQuizData || []).map(quiz => ({
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

      // Fetch related games from the same category
      const { data: relatedGameData, error: gameError } = await supabase
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
        .eq("is_public", true)
        .eq("status", "publicado")
        .eq("category", category as any)
        .neq("id", gameId || "")
        .order("created_at", { ascending: false })
        .limit(10);

      if (gameError) throw gameError;

      // Get question counts for related games
      const gameIds = (relatedGameData || []).map(g => g.id);
      const gameQuestionCounts: Record<string, number> = {};
      
      if (gameIds.length > 0) {
        const { data: gameQuestionsData } = await supabase
          .from("game_questions")
          .select("game_id")
          .in("game_id", gameIds);
        
        if (gameQuestionsData) {
          gameQuestionsData.forEach((q) => {
            gameQuestionCounts[q.game_id] = (gameQuestionCounts[q.game_id] || 0) + 1;
          });
        }
      }

      // Transform games
      const relatedGames = (relatedGameData || []).map(game => ({
        ...game,
        content_type: 'game' as const,
        likes_count: 0,
        views_count: 0,
        saves_count: 0,
        shares_count: 0,
        comments_count: 0,
        video_url: null,
        document_url: null,
        rich_text: null,
        tags: game.tags || [],
        questions_count: gameQuestionCounts[game.id] || 0,
      }));

      // Combine target item with related content, shuffled
      const allRelated = [...(relatedContentData || []), ...relatedQuizzes, ...relatedGames]
        .sort(() => Math.random() - 0.5)
        .slice(0, 9); // Get 9 related items

      return [targetItem, ...allRelated];
    },
    enabled: !!(contentId || quizId || gameId),
  });
};
