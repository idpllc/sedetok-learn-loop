import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { subjects as subjectOptions } from "@/lib/subjects";
const ITEMS_PER_PAGE = 5;

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
      // Fetch sufficient items to allow filtering + pagination across types
      const batchSize = Math.max((pageParam + 1) * ITEMS_PER_PAGE, 30);
      
      // Fetch regular content with pagination
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
        `, { count: 'exact' })
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (contentType && contentType !== "all" && contentType !== "quiz" && contentType !== "game") {
        contentQuery = contentQuery.eq("content_type", contentType as any);
      }

      // Apply search filter (title, description, subject)
      if (searchQuery && searchQuery.trim() !== "") {
        contentQuery = contentQuery.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`);
      }

      // Apply subject filter directly in database query (accent-insensitive with label/value variants)
      if (subject && subject !== "all") {
        const opt = subjectOptions.find(s => s.value === subject);
        const label = opt?.label || subject;
        const deaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const patterns = Array.from(new Set([subject, label, deaccent(label), deaccent(subject)]));
        const orFilters = patterns
          .flatMap(p => [
            `subject.ilike.%${p}%`,
            `title.ilike.%${p}%`,
            `description.ilike.%${p}%`
          ])
          .join(',');
        contentQuery = contentQuery.or(orFilters);
      }

      // Apply grade level filter
      if (gradeLevel && gradeLevel !== "all") {
        contentQuery = contentQuery.eq("grade_level", gradeLevel as any);
      }

      const { data: contentData, error: contentError, count: contentCount } = await contentQuery.limit(batchSize);

      if (contentError) throw contentError;

      // Fetch quizzes only if not filtering by specific content type or if type is quiz
      let quizData = [];
      let quizCount = 0;
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
          `, { count: 'exact' })
          .eq("is_public", true)
          .eq("status", "publicado")
          .order("created_at", { ascending: false });

        // Apply search filter (title, description, subject)
        if (searchQuery && searchQuery.trim() !== "") {
          quizQuery = quizQuery.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`);
        }

        // Apply subject filter directly in database query (accent-insensitive with label/value variants)
        if (subject && subject !== "all") {
          const opt = subjectOptions.find(s => s.value === subject);
          const label = opt?.label || subject;
          const deaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const patterns = Array.from(new Set([subject, label, deaccent(label), deaccent(subject)]));
          const orFilters = patterns
            .flatMap(p => [
              `subject.ilike.%${p}%`,
              `title.ilike.%${p}%`,
              `description.ilike.%${p}%`
            ])
            .join(',');
          quizQuery = quizQuery.or(orFilters);
        }

        // Apply grade level filter
        if (gradeLevel && gradeLevel !== "all") {
          quizQuery = quizQuery.eq("grade_level", gradeLevel as any);
        }

        const { data: fetchedQuizData, error: quizError, count: fetchedQuizCount } = await quizQuery.limit(batchSize);

        if (quizError) throw quizError;
        quizData = fetchedQuizData || [];
        quizCount = fetchedQuizCount || 0;
      }

      // Fetch games only if not filtering by specific content type or if type is game
      let gameData = [];
      let gameCount = 0;
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
          `, { count: 'exact' })
          .eq("is_public", true)
          .order("created_at", { ascending: false });

        // Apply search filter (title, description, subject)
        if (searchQuery && searchQuery.trim() !== "") {
          gameQuery = gameQuery.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`);
        }

        // Apply subject filter directly in database query (accent-insensitive fallback)
        if (subject && subject !== "all") {
          const normalizedSubject = subject.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          gameQuery = gameQuery.or(`subject.ilike.%${subject}%,subject.ilike.%${normalizedSubject}%`);
        }

        // Apply grade level filter
        if (gradeLevel && gradeLevel !== "all") {
          gameQuery = gameQuery.eq("grade_level", gradeLevel as any);
        }

        const { data: fetchedGameData, error: gameError, count: fetchedGameCount } = await gameQuery.limit(batchSize);

        if (gameError) throw gameError;
        gameData = fetchedGameData || [];
        gameCount = fetchedGameCount || 0;
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

      // Combine all arrays and sort by created_at
      let allContent = [...(contentData || []), ...quizzes, ...games].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Apply client-side tag filtering if search query exists
      if (searchQuery && searchQuery.trim() !== "") {
        const searchLower = searchQuery.toLowerCase();
        allContent = allContent.filter(item => {
          // Already matched by DB query (title, description, subject)
          const matchedByDB = 
            item.title?.toLowerCase().includes(searchLower) ||
            item.description?.toLowerCase().includes(searchLower) ||
            item.subject?.toLowerCase().includes(searchLower);
          
          // Check if any tag matches
          const matchedByTags = item.tags?.some((tag: string) => 
            tag.toLowerCase().includes(searchLower)
          );
          
          return matchedByDB || matchedByTags;
        });
      }

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
