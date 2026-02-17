import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { subjects as subjectOptions } from "@/lib/subjects";
const ITEMS_PER_PAGE = 20;

// Helper to build subject filters
const buildSubjectFilter = (subject: string) => {
  const opt = subjectOptions.find(s => s.value === subject);
  const label = opt?.label || subject;
  const deaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const patterns = Array.from(new Set([subject, label, deaccent(label), deaccent(subject)]));
  return patterns
    .flatMap(p => [
      `subject.ilike.%${p}%`,
      `title.ilike.%${p}%`,
      `description.ilike.%${p}%`
    ])
    .join(',');
};

export const useInfiniteContent = (
  contentType?: string, 
  searchQuery?: string,
  subject?: string,
  gradeLevel?: string
) => {
  return useInfiniteQuery({
    queryKey: ["infinite-content", contentType, searchQuery, subject, gradeLevel],
    queryFn: async ({ pageParam = 0 }) => {
      // We use a cursor-based approach: pageParam is the page number.
      // We fetch ITEMS_PER_PAGE from each active source, merge, sort, and take ITEMS_PER_PAGE.
      // To get the right offset for each source, we track cumulative offsets via pageParam.
      const offset = pageParam * ITEMS_PER_PAGE;

      const includeContent = !contentType || contentType === "all" || (contentType !== "quiz" && contentType !== "game" && contentType !== "learning_path");
      const includeQuizzes = !contentType || contentType === "all" || contentType === "quiz";
      const includeGames = !contentType || contentType === "all" || contentType === "game";
      const includePaths = !contentType || contentType === "all" || contentType === "learning_path";

      // Build all queries in parallel, each fetching ITEMS_PER_PAGE items at the right offset
      const promises: Promise<any>[] = [];

      // --- Content ---
      if (includeContent) {
        let q = supabase
          .from("content")
          .select(`*, profiles:creator_id (username, full_name, avatar_url, institution, is_verified)`, { count: 'exact' })
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .range(offset, offset + ITEMS_PER_PAGE - 1);
        if (contentType && contentType !== "all" && contentType !== "learning_path") {
          q = q.eq("content_type", contentType as any);
        }
        if (searchQuery?.trim()) {
          q = q.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`);
        }
        if (subject && subject !== "all") {
          q = q.or(buildSubjectFilter(subject));
        }
        if (gradeLevel && gradeLevel !== "all") {
          q = q.eq("grade_level", gradeLevel as any);
        }
        promises.push(Promise.resolve(q).then(r => ({ source: 'content', data: r.data || [], count: r.count || 0, error: r.error })));
      } else {
        promises.push(Promise.resolve({ source: 'content', data: [], count: 0, error: null }));
      }

      // --- Quizzes ---
      if (includeQuizzes) {
        let q = supabase
          .from("quizzes")
          .select(`*, profiles:creator_id (username, full_name, avatar_url, institution, is_verified)`, { count: 'exact' })
          .eq("is_public", true)
          .eq("status", "publicado")
          .order("created_at", { ascending: false })
          .range(offset, offset + ITEMS_PER_PAGE - 1);
        if (searchQuery?.trim()) {
          q = q.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`);
        }
        if (subject && subject !== "all") {
          q = q.or(buildSubjectFilter(subject));
        }
        if (gradeLevel && gradeLevel !== "all") {
          q = q.eq("grade_level", gradeLevel as any);
        }
        promises.push(Promise.resolve(q).then(r => ({ source: 'quizzes', data: r.data || [], count: r.count || 0, error: r.error })));
      } else {
        promises.push(Promise.resolve({ source: 'quizzes', data: [], count: 0, error: null }));
      }

      // --- Games ---
      if (includeGames) {
        let q = supabase
          .from("games")
          .select(`*, profiles:creator_id (username, full_name, avatar_url, institution, is_verified)`, { count: 'exact' })
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .range(offset, offset + ITEMS_PER_PAGE - 1);
        if (searchQuery?.trim()) {
          q = q.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`);
        }
        if (subject && subject !== "all") {
          const normalizedSubject = subject.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          q = q.or(`subject.ilike.%${subject}%,subject.ilike.%${normalizedSubject}%`);
        }
        if (gradeLevel && gradeLevel !== "all") {
          q = q.eq("grade_level", gradeLevel as any);
        }
        promises.push(Promise.resolve(q).then(r => ({ source: 'games', data: r.data || [], count: r.count || 0, error: r.error })));
      } else {
        promises.push(Promise.resolve({ source: 'games', data: [], count: 0, error: null }));
      }

      // --- Learning Paths ---
      if (includePaths) {
        let q = supabase
          .from("learning_paths")
          .select(`*, profiles:creator_id (username, full_name, avatar_url, institution, is_verified)`, { count: 'exact' })
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .range(offset, offset + ITEMS_PER_PAGE - 1);
        if (searchQuery?.trim()) {
          q = q.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`);
        }
        if (subject && subject !== "all") {
          q = q.or(buildSubjectFilter(subject));
        }
        if (gradeLevel && gradeLevel !== "all") {
          q = q.eq("grade_level", gradeLevel as any);
        }
        promises.push(Promise.resolve(q).then(r => ({ source: 'paths', data: r.data || [], count: r.count || 0, error: r.error })));
      } else {
        promises.push(Promise.resolve({ source: 'paths', data: [], count: 0, error: null }));
      }

      const [contentResult, quizResult, gameResult, pathResult] = await Promise.all(promises);

      if (contentResult.error) throw contentResult.error;
      if (quizResult.error) throw quizResult.error;
      if (gameResult.error) throw gameResult.error;
      if (pathResult.error) throw pathResult.error;

      // Mark each item with its type
      const contentItems = (contentResult.data as any[]).map((item: any) => ({ ...item, itemType: 'content' }));
      
      const quizItems = (quizResult.data as any[]).map((quiz: any) => ({
        ...quiz,
        content_type: 'quiz' as const,
        itemType: 'content',
        likes_count: 0,
        views_count: 0,
        saves_count: 0,
        shares_count: 0,
        comments_count: 0,
        video_url: null,
        document_url: null,
        rich_text: null,
        tags: quiz.tags || [],
        questions_count: 0,
      }));

      const gameItems = (gameResult.data as any[]).map((game: any) => ({
        ...game,
        content_type: 'game' as const,
        itemType: 'content',
        likes_count: game.likes_count || 0,
        views_count: 0,
        saves_count: game.saves_count || 0,
        shares_count: game.shares_count || 0,
        comments_count: game.comments_count || 0,
        video_url: null,
        document_url: null,
        rich_text: null,
        tags: game.tags || [],
        questions_count: 0,
      }));

      const pathItems = (pathResult.data as any[]).map((path: any) => ({ ...path, itemType: 'learning_path' }));

      // Merge all, sort by created_at descending, take only ITEMS_PER_PAGE
      let allItems = [...contentItems, ...quizItems, ...gameItems, ...pathItems]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, ITEMS_PER_PAGE);

      // Client-side tag filtering
      if (searchQuery?.trim()) {
        const searchLower = searchQuery.toLowerCase();
        allItems = allItems.filter(item => {
          const matchedByDB = 
            item.title?.toLowerCase().includes(searchLower) ||
            item.description?.toLowerCase().includes(searchLower) ||
            item.subject?.toLowerCase().includes(searchLower);
          const matchedByTags = item.tags?.some((tag: string) => 
            tag.toLowerCase().includes(searchLower)
          );
          return matchedByDB || matchedByTags;
        });
      }

      // Calculate total count from all sources
      const totalCount = contentResult.count + quizResult.count + gameResult.count + pathResult.count;
      const hasMore = allItems.length === ITEMS_PER_PAGE && (offset + ITEMS_PER_PAGE) < totalCount;

      return {
        items: allItems,
        nextPage: hasMore ? pageParam + 1 : undefined,
        totalCount,
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
