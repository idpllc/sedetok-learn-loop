import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useUserActivity = () => {
  const { user } = useAuth();

  const { data: likedContent, isLoading: likesLoading } = useQuery({
    queryKey: ["userLikes", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: likes, error: likesError } = await supabase
        .from("likes")
        .select("content_id, quiz_id, game_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (likesError) throw likesError;

      const contentIds = likes?.filter(l => l.content_id).map(l => l.content_id) || [];
      const quizIds = likes?.filter(l => l.quiz_id).map(l => l.quiz_id) || [];
      const gameIds = likes?.filter(l => l.game_id).map(l => l.game_id) || [];

      let content = [];
      if (contentIds.length > 0) {
        const { data: contentData } = await supabase
          .from("content")
          .select("*")
          .in("id", contentIds);
        content = contentData || [];
      }

      let quizzes = [];
      if (quizIds.length > 0) {
        const { data: quizData } = await supabase
          .from("quizzes")
          .select("*")
          .in("id", quizIds);
        quizzes = (quizData || []).map(q => ({ ...q, content_type: 'quiz' }));
      }

      let games = [];
      if (gameIds.length > 0) {
        const { data: gameData } = await supabase
          .from("games")
          .select("*")
          .in("id", gameIds);
        games = (gameData || []).map(g => ({ ...g, content_type: 'game' }));
      }

      return [...content, ...quizzes, ...games];
    },
    enabled: !!user,
  });

  const { data: savedContent, isLoading: savesLoading } = useQuery({
    queryKey: ["userSaves", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: saves, error: savesError } = await supabase
        .from("saves")
        .select("content_id, quiz_id, game_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (savesError) throw savesError;

      const contentIds = saves?.filter(s => s.content_id).map(s => s.content_id) || [];
      const quizIds = saves?.filter(s => s.quiz_id).map(s => s.quiz_id) || [];
      const gameIds = saves?.filter(s => s.game_id).map(s => s.game_id) || [];

      let content = [];
      if (contentIds.length > 0) {
        const { data: contentData } = await supabase
          .from("content")
          .select("*")
          .in("id", contentIds);
        content = contentData || [];
      }

      let quizzes = [];
      if (quizIds.length > 0) {
        const { data: quizData } = await supabase
          .from("quizzes")
          .select("*")
          .in("id", quizIds);
        quizzes = (quizData || []).map(q => ({ ...q, content_type: 'quiz' }));
      }

      let games = [];
      if (gameIds.length > 0) {
        const { data: gameData } = await supabase
          .from("games")
          .select("*")
          .in("id", gameIds);
        games = (gameData || []).map(g => ({ ...g, content_type: 'game' }));
      }

      return [...content, ...quizzes, ...games];
    },
    enabled: !!user,
  });

  // For shared content, we track by shares_count
  // Since there's no shares table, we'll show content with highest shares
  const { data: sharedContent, isLoading: sharesLoading } = useQuery({
    queryKey: ["userShares", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: content } = await supabase
        .from("content")
        .select("*")
        .eq("creator_id", user.id)
        .gt("shares_count", 0)
        .order("shares_count", { ascending: false })
        .limit(20);

      return content || [];
    },
    enabled: !!user,
  });

  return {
    likedContent: likedContent || [],
    savedContent: savedContent || [],
    sharedContent: sharedContent || [],
    isLoading: likesLoading || savesLoading || sharesLoading,
  };
};
