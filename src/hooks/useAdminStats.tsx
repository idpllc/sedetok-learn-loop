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
      };
    },
  });
};
