import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAdminStats = () => {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      // Get total users
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get content stats by type
      const { data: contentStats } = await supabase
        .from("content")
        .select("content_type, views_count");

      // Get quizzes count
      const { count: quizzesCount } = await supabase
        .from("quizzes")
        .select("*", { count: "exact", head: true });

      // Get learning paths count
      const { count: pathsCount } = await supabase
        .from("learning_paths")
        .select("*", { count: "exact", head: true });

      // Get completed paths count
      const { count: completedPathsCount } = await supabase
        .from("user_path_progress")
        .select("*", { count: "exact", head: true })
        .eq("completed", true);

      // Get completed quizzes count
      const { count: completedQuizzesCount } = await supabase
        .from("user_quiz_results")
        .select("*", { count: "exact", head: true });

      // Get chat conversations count
      const { count: chatGroupsCount } = await supabase
        .from("chat_conversations")
        .select("*", { count: "exact", head: true });

      // Get notebooks count
      const { count: notebooksCount } = await (supabase as any)
        .from("notebooks")
        .select("*", { count: "exact", head: true });

      // Get total user-to-user chat messages count (excluding deleted)
      const { count: chatMessagesCount } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null);

      // Get AI messages (Sede AI + Language Tutor Alex), differentiated by conversation title prefix
      // Conversations starting with "[ALEX]" belong to the language tutor agent; the rest are Sede AI
      const { data: aiConversations } = await (supabase as any)
        .from("ai_chat_messages")
        .select("role, conversation_id, ai_chat_conversations!inner(title)")
        .eq("role", "user");

      let sedeAiMessagesCount = 0;
      let alexMessagesCount = 0;
      (aiConversations || []).forEach((m: any) => {
        const title: string = m.ai_chat_conversations?.title || "";
        if (title.startsWith("[ALEX]")) alexMessagesCount++;
        else sedeAiMessagesCount++;
      });
      const aiMessagesTotal = sedeAiMessagesCount + alexMessagesCount;
      const mostUsedAgent =
        aiMessagesTotal === 0
          ? "—"
          : sedeAiMessagesCount >= alexMessagesCount
          ? "Sede AI"
          : "Alex (Tutor de Inglés)";

      // Calculate stats from content
      let videosCount = 0;
      let documentsCount = 0;
      let readingsCount = 0;
      let totalViews = 0;

      contentStats?.forEach((item) => {
        if (item.content_type === "video") videosCount++;
        if (item.content_type === "document") documentsCount++;
        if (item.content_type === "lectura") readingsCount++;
        totalViews += item.views_count || 0;
      });

      // Estimate viewing hours (assuming average 10 min per view)
      const estimatedViewingHours = Math.round((totalViews * 10) / 60);

      return {
        usersCount: usersCount || 0,
        videosCount,
        documentsCount,
        readingsCount,
        quizzesCount: quizzesCount || 0,
        pathsCount: pathsCount || 0,
        totalViews,
        estimatedViewingHours,
        completedPathsCount: completedPathsCount || 0,
        completedQuizzesCount: completedQuizzesCount || 0,
        chatGroupsCount: chatGroupsCount || 0,
        chatMessagesCount: chatMessagesCount || 0,
        aiMessagesTotal,
        sedeAiMessagesCount,
        alexMessagesCount,
        mostUsedAgent,
      };
    },
  });
};
