import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

      // Get question counts for each quiz
      const quizIds = (quizData || []).map(q => q.id);
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

      // Combine both arrays and sort by created_at
      const allContent = [...(contentData || []), ...quizzes].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 50);

      return allContent;
    },
  });

  const likeMutation = useMutation({
    mutationFn: async ({ contentId, isLiked, isQuiz }: { contentId: string; isLiked: boolean; isQuiz?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const idField = isQuiz ? "quiz_id" : "content_id";
      
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
    mutationFn: async ({ contentId, isSaved, isQuiz }: { contentId: string; isSaved: boolean; isQuiz?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const idField = isQuiz ? "quiz_id" : "content_id";
      
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
        .select("content_id, quiz_id");

      if (error) throw error;
      return new Set(data.map(like => like.content_id || like.quiz_id));
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
        .select("content_id, quiz_id");

      if (error) throw error;
      return new Set(data.map(save => save.content_id || save.quiz_id));
    },
  });

  return { saves: saves || new Set() };
};
