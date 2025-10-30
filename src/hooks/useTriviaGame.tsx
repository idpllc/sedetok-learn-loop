import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface TriviaCategory {
  id: string;
  name: string;
  intelligence_type: string;
  color: string;
  icon: string;
  description: string;
}

export interface TriviaQuestion {
  id: string;
  category_id: string;
  question_text: string;
  options: Array<{option_text: string; is_correct: boolean}>;
  correct_answer: number;
  difficulty: string;
  points: number;
  image_url?: string;
}

export interface TriviaUserStats {
  user_id: string;
  total_points: number;
  total_matches: number;
  total_correct: number;
  total_incorrect: number;
  best_streak: number;
  current_streak: number;
}

export const useTriviaGame = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ["trivia-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trivia_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as TriviaCategory[];
    },
  });

  // Fetch user stats
  const { data: userStats, isLoading: loadingStats } = useQuery({
    queryKey: ["trivia-user-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("trivia_user_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      
      // Create stats if they don't exist
      if (!data) {
        const { data: newStats, error: insertError } = await supabase
          .from("trivia_user_stats")
          .insert([{ user_id: user.id }])
          .select()
          .single();
        if (insertError) throw insertError;
        return newStats as TriviaUserStats;
      }
      
      return data as TriviaUserStats;
    },
    enabled: !!user,
  });

  // Fetch questions by category
  const fetchQuestionsByCategory = async (categoryId: string, level: string = "libre") => {
    let query = supabase
      .from("trivia_questions")
      .select("*")
      .eq("category_id", categoryId)
      .eq("is_active", true);

    if (level !== "libre") {
      query = query.eq("level", level);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    // Parse options from JSON and shuffle questions
    const questions = (data || []).map(q => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
    })) as TriviaQuestion[];
    
    const shuffled = questions.sort(() => Math.random() - 0.5);
    return shuffled;
  };

  // Save match result
  const saveMatch = useMutation({
    mutationFn: async (matchData: {
      points_earned: number;
      correct_answers: number;
      incorrect_answers: number;
      questions_answered: number;
      best_streak: number;
      duration_seconds: number;
    }) => {
      if (!user) throw new Error("Usuario no autenticado");

      // Match data is saved in trivia_user_stats, not separate matches table
      // Stats will be updated below

      // Update user stats
      const currentStats = userStats || {
        total_points: 0,
        total_matches: 0,
        total_correct: 0,
        total_incorrect: 0,
        best_streak: 0,
        current_streak: 0,
      };

      const newStreak = matchData.correct_answers > 0 ? (currentStats.current_streak || 0) + matchData.best_streak : 0;
      
      const { error: statsError } = await supabase
        .from("trivia_user_stats")
        .upsert({
          user_id: user.id,
          total_points: currentStats.total_points + matchData.points_earned,
          total_matches: currentStats.total_matches + 1,
          total_correct: currentStats.total_correct + matchData.correct_answers,
          total_incorrect: currentStats.total_incorrect + matchData.incorrect_answers,
          best_streak: Math.max(currentStats.best_streak, matchData.best_streak),
          current_streak: newStreak,
        });
      
      if (statsError) throw statsError;

      // Check for achievements
      await checkAchievements(user.id, {
        ...currentStats,
        total_points: currentStats.total_points + matchData.points_earned,
        total_matches: currentStats.total_matches + 1,
        best_streak: Math.max(currentStats.best_streak, matchData.best_streak),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trivia-user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["trivia-matches"] });
      queryClient.invalidateQueries({ queryKey: ["trivia-rankings"] });
    },
  });

  // Check and award achievements
  const checkAchievements = async (userId: string, stats: Partial<TriviaUserStats>) => {
    const { data: achievements } = await supabase
      .from("trivia_achievements")
      .select("*");
    
    if (!achievements) return;

    const { data: userAchievements } = await supabase
      .from("trivia_user_achievements")
      .select("achievement_id")
      .eq("user_id", userId);
    
    const earnedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || []);

    for (const achievement of achievements) {
      if (earnedIds.has(achievement.id)) continue;

      let earned = false;
      
      switch (achievement.requirement_type) {
        case "matches_played":
          earned = (stats.total_matches || 0) >= achievement.requirement_value;
          break;
        case "streak":
          earned = (stats.best_streak || 0) >= achievement.requirement_value;
          break;
        case "total_points":
          earned = (stats.total_points || 0) >= achievement.requirement_value;
          break;
      }

      if (earned) {
        await supabase
          .from("trivia_user_achievements")
          .insert([{ user_id: userId, achievement_id: achievement.id }]);
        
        toast({
          title: "🏆 ¡Nuevo logro desbloqueado!",
          description: `${achievement.icon} ${achievement.name}: ${achievement.description}`,
          duration: 5000,
        });
      }
    }
  };

  return {
    categories,
    loadingCategories,
    userStats,
    loadingStats,
    fetchQuestionsByCategory,
    saveMatch,
  };
};

// Hook for rankings
export const useTriviaRankings = () => {
  const { data: globalRanking, isLoading } = useQuery({
    queryKey: ["trivia-rankings", "global"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trivia_user_stats")
        .select(`
          *,
          profiles:user_id (
            username,
            full_name,
            avatar_url
          )
        `)
        .order("total_points", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
  });

  return { globalRanking, isLoading };
};

// Hook for user achievements
export const useTriviaAchievements = () => {
  const { user } = useAuth();

  const { data: userAchievements, isLoading } = useQuery({
    queryKey: ["trivia-user-achievements", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("trivia_user_achievements")
        .select(`
          *,
          achievement:achievement_id (
            name,
            description,
            icon,
            requirement_type,
            requirement_value
          )
        `)
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return { userAchievements, isLoading };
};
