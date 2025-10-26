import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 10;

export const useInfiniteContent = (
  contentType?: string, 
  searchQuery?: string,
  subject?: string,
  gradeLevel?: string
) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useInfiniteQuery({
    queryKey: ["infinite-content", contentType, searchQuery, subject, gradeLevel],
    queryFn: async ({ pageParam = 0 }) => {
      // Fetch sufficient items to allow filtering + pagination without over-fetching
      const batchSize = Math.max((pageParam + 1) * ITEMS_PER_PAGE, 30);
      
      // Fetch regular content
      let contentQuery = supabase
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
        .order("created_at", { ascending: false })
        .limit(batchSize);

      if (contentType && contentType !== "all" && contentType !== "quiz") {
        contentQuery = contentQuery.eq("content_type", contentType as any);
      }

      // Apply search filter
      if (searchQuery && searchQuery.trim() !== "") {
        contentQuery = contentQuery.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`);
      }

      // Apply subject filter
      // Subject filter handled client-side for accent-insensitive matching
      // Apply grade level filter
      if (gradeLevel && gradeLevel !== "all") {
        contentQuery = contentQuery.eq("grade_level", gradeLevel as any);
      }

      const { data: contentData, error: contentError } = await contentQuery;

      if (contentError) throw contentError;

      // Fetch quizzes only if not filtering by specific content type or if type is quiz
      let quizData = [];
      if (!contentType || contentType === "all" || contentType === "quiz") {
        let quizQuery = supabase
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
          .order("created_at", { ascending: false })
          .limit(batchSize);

        // Apply search filter
        if (searchQuery && searchQuery.trim() !== "") {
          quizQuery = quizQuery.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`);
        }

        // Apply subject filter
        // Subject filter handled client-side for accent-insensitive matching
        // Apply grade level filter
        if (gradeLevel && gradeLevel !== "all") {
          quizQuery = quizQuery.eq("grade_level", gradeLevel as any);
        }

        const { data: fetchedQuizData, error: quizError } = await quizQuery;

        if (quizError) throw quizError;
        quizData = fetchedQuizData || [];
      }

      // Fetch games only if not filtering by specific content type or if type is game
      let gameData = [];
      if (!contentType || contentType === "all" || contentType === "game") {
        let gameQuery = supabase
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
          .order("created_at", { ascending: false })
          .limit(batchSize);

        // Apply search filter
        if (searchQuery && searchQuery.trim() !== "") {
          gameQuery = gameQuery.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`);
        }

        // Apply grade level filter
        if (gradeLevel && gradeLevel !== "all") {
          gameQuery = gameQuery.eq("grade_level", gradeLevel as any);
        }

        const { data: fetchedGameData, error: gameError } = await gameQuery;

        if (gameError) throw gameError;
        gameData = fetchedGameData || [];
      }

      // Get question counts for each quiz and game
      const quizIds = quizData.map(q => q.id);
      const gameIds = gameData.map(g => g.id);
      const questionCounts: Record<string, number> = {};
      const likeCounts: Record<string, number> = {};
      const commentCounts: Record<string, number> = {};
      
      if (quizIds.length > 0) {
        // Get question counts
        const { data: questionsData } = await supabase
          .from("quiz_questions")
          .select("content_id")
          .in("content_id", quizIds);
        
        if (questionsData) {
          questionsData.forEach((q) => {
            questionCounts[q.content_id] = (questionCounts[q.content_id] || 0) + 1;
          });
        }

        // Get like counts for quizzes
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

        // Get comment counts for quizzes
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

      // Get question counts for games
      if (gameIds.length > 0) {
        const { data: gameQuestionsData } = await supabase
          .from("game_questions")
          .select("game_id")
          .in("game_id", gameIds);
        
        if (gameQuestionsData) {
          gameQuestionsData.forEach((q) => {
            questionCounts[q.game_id] = (questionCounts[q.game_id] || 0) + 1;
          });
        }
      }

      // Combine and mark quizzes with content_type
      const quizzes = quizData.map(quiz => ({
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
        tags: [],
        questions_count: questionCounts[quiz.id] || 0,
      }));

      // Combine and mark games with content_type
      const games = gameData.map(game => ({
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

      // Accent-insensitive normalization
      const normalize = (s?: string | null) => (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

      // Client-side filters to handle accents and ensure matches
      let filteredContentData = (contentData || []);
      let filteredQuizzes = quizzes;
      let filteredGames = games;

      if ((subject && subject !== 'all') || (searchQuery && searchQuery.trim() !== '')) {
        const subjectFilter = normalize(subject || '');
        const textFilter = normalize(searchQuery || '');
        const matches = (item: any) => {
          const subj = normalize((item as any).subject);
          const title = normalize((item as any).title);
          const desc = normalize((item as any).description);
          let ok = true;
          if (subject && subject !== 'all') ok = ok && subj.includes(subjectFilter);
          if (searchQuery && searchQuery.trim() !== '') {
            ok = ok && (title.includes(textFilter) || desc.includes(textFilter) || subj.includes(textFilter));
          }
          return ok;
        };
        filteredContentData = filteredContentData.filter(matches);
        filteredQuizzes = filteredQuizzes.filter(matches);
        filteredGames = filteredGames.filter(matches);
      }

      // Combine all arrays and sort by created_at
      const allContent = [...filteredContentData, ...filteredQuizzes, ...filteredGames].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Paginate the combined results to ensure exactly ITEMS_PER_PAGE per page
      const startIndex = pageParam * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const paginatedItems = allContent.slice(startIndex, endIndex);

      return {
        items: paginatedItems,
        nextPage: endIndex < allContent.length ? pageParam + 1 : undefined,
        totalCount: allContent.length,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
};

export const useContent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: content, isLoading } = useQuery({
    queryKey: ["content"],
    queryFn: async () => {
      // Fetch regular content
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
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (contentError) throw contentError;

      // Fetch quizzes
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
        .eq("is_public", true)
        .eq("status", "publicado")
        .order("created_at", { ascending: false })
        .limit(50);

      if (quizError) throw quizError;

      // Fetch games
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
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (gameError) throw gameError;

      // Get question counts for each quiz and game
      const quizIds = (quizData || []).map(q => q.id);
      const gameIds = (gameData || []).map(g => g.id);
      const questionCounts: Record<string, number> = {};
      const likeCounts: Record<string, number> = {};
      const commentCounts: Record<string, number> = {};
      
      if (quizIds.length > 0) {
        // Get question counts
        const { data: questionsData } = await supabase
          .from("quiz_questions")
          .select("content_id")
          .in("content_id", quizIds);
        
        if (questionsData) {
          questionsData.forEach((q) => {
            questionCounts[q.content_id] = (questionCounts[q.content_id] || 0) + 1;
          });
        }

        // Get like counts for quizzes
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

        // Get comment counts for quizzes
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

      // Get question counts for games
      if (gameIds.length > 0) {
        const { data: gameQuestionsData } = await supabase
          .from("game_questions")
          .select("game_id")
          .in("game_id", gameIds);
        
        if (gameQuestionsData) {
          gameQuestionsData.forEach((q) => {
            questionCounts[q.game_id] = (questionCounts[q.game_id] || 0) + 1;
          });
        }
      }

      // Combine and mark quizzes with content_type
      const quizzes = (quizData || []).map(quiz => ({
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
        tags: [],
        questions_count: questionCounts[quiz.id] || 0,
      }));

      // Combine and mark games with content_type
      const games = (gameData || []).map(game => ({
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

      // Combine all arrays and sort by created_at
      const allContent = [...(contentData || []), ...quizzes, ...games].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 50);

      return allContent;
    },
  });

  const likeMutation = useMutation({
    mutationFn: async ({ contentId, isLiked, isQuiz, isGame }: { contentId: string; isLiked: boolean; isQuiz?: boolean; isGame?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const idField = isGame ? "game_id" : isQuiz ? "quiz_id" : "content_id";
      
      if (isLiked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq(idField, contentId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("likes")
          .insert([{ [idField]: contentId, user_id: user.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content"] });
      queryClient.invalidateQueries({ queryKey: ["likes"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ contentId, isSaved, isQuiz, isGame }: { contentId: string; isSaved: boolean; isQuiz?: boolean; isGame?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const idField = isGame ? "game_id" : isQuiz ? "quiz_id" : "content_id";
      
      if (isSaved) {
        const { error } = await supabase
          .from("saves")
          .delete()
          .eq(idField, contentId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saves")
          .insert([{ [idField]: contentId, user_id: user.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saves"] });
      queryClient.invalidateQueries({ queryKey: ["content"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    content,
    isLoading,
    likeMutation,
    saveMutation,
  };
};

export const useUserLikes = () => {
  const { data: likes } = useQuery({
    queryKey: ["likes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("likes")
        .select("content_id, quiz_id, game_id");

      if (error) throw error;
      return new Set(data.map(like => like.content_id || like.quiz_id || like.game_id));
    },
  });

  return { likes: likes || new Set() };
};

export const useUserSaves = () => {
  const { data: saves } = useQuery({
    queryKey: ["saves"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saves")
        .select("content_id, quiz_id, game_id");

      if (error) throw error;
      return new Set(data.map(save => save.content_id || save.quiz_id || save.game_id));
    },
  });

  return { saves: saves || new Set() };
};
