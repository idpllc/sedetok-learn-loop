import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { academicAreas } from "@/lib/academicAreas";
import { intelligenceTypes } from "@/lib/intelligenceTypes";

interface AreaMetrics {
  area: string;
  score: number;
  quizzesCompleted: number;
  averageScore: number;
  videosWatched: number;
}

interface IntelligenceMetrics {
  intelligence: string;
  icon: string;
  description: string;
  score: number;
  quizzesCompleted: number;
  averageScore: number;
  videosWatched: number;
}

export const useInstitutionAcademicMetrics = (institutionId?: string) => {
  return useQuery({
    queryKey: ["institution-academic-metrics", institutionId],
    queryFn: async () => {
      if (!institutionId) return null;

      // Get all students from the institution
      const { data: students, error: studentsError } = await supabase
        .from("institution_members")
        .select("user_id")
        .eq("institution_id", institutionId)
        .eq("member_role", "student")
        .eq("status", "active");

      if (studentsError) throw studentsError;
      if (!students || students.length === 0) return null;

      const studentIds = students.map(s => s.user_id);

      // Get all quiz results from students
      const { data: quizResults, error: quizError } = await supabase
        .from("user_quiz_results")
        .select("score, max_score, area_academica, quiz_id, user_id")
        .in("user_id", studentIds);

      if (quizError) {
        console.error("Error fetching quiz results:", quizError);
        throw quizError;
      }

      console.log(`Found ${quizResults?.length || 0} quiz results for ${studentIds.length} students`);

      // Get videos watched through user_path_progress
      const { data: videoProgress, error: progressError } = await supabase
        .from("user_path_progress")
        .select(`
          content_id,
          user_id,
          completed,
          content:content(category, subject, content_type)
        `)
        .in("user_id", studentIds)
        .eq("completed", true)
        .not("content_id", "is", null);

      if (progressError) {
        console.error("Error fetching video progress:", progressError);
        throw progressError;
      }

      // Filter only videos
      const viewedContent = videoProgress?.filter(
        (p: any) => p.content?.content_type === "video"
      ) || [];

      console.log(`Found ${viewedContent.length} videos watched by students`);

      // Initialize metrics for academic areas
      const areaMetrics: Record<string, AreaMetrics> = {};
      academicAreas.forEach(area => {
        areaMetrics[area.name] = {
          area: area.name,
          score: 0,
          quizzesCompleted: 0,
          averageScore: 0,
          videosWatched: 0,
        };
      });

      // Initialize metrics for intelligences
      const intelligenceMetrics: Record<string, IntelligenceMetrics> = {};
      intelligenceTypes.forEach(intel => {
        intelligenceMetrics[intel.name] = {
          intelligence: intel.name,
          icon: intel.icon,
          description: intel.description,
          score: 0,
          quizzesCompleted: 0,
          averageScore: 0,
          videosWatched: 0,
        };
      });

      // Process quiz results
      let totalQuizzes = 0;
      let totalScore = 0;
      let totalMaxScore = 0;

      quizResults?.forEach(result => {
        const areaName = result.area_academica || "Otras";
        
        if (areaMetrics[areaName]) {
          areaMetrics[areaName].quizzesCompleted++;
          areaMetrics[areaName].averageScore += (result.score / result.max_score) * 100;
        }

        totalQuizzes++;
        totalScore += result.score;
        totalMaxScore += result.max_score;

        // Map to intelligences
        const area = academicAreas.find(a => a.name === areaName);
        if (area) {
          area.relatedIntelligences.forEach(intelName => {
            if (intelligenceMetrics[intelName]) {
              intelligenceMetrics[intelName].quizzesCompleted++;
              intelligenceMetrics[intelName].averageScore += (result.score / result.max_score) * 100;
            }
          });
        }
      });

      // Calculate average scores and final scores for areas
      Object.keys(areaMetrics).forEach(key => {
        const metric = areaMetrics[key];
        if (metric.quizzesCompleted > 0) {
          metric.averageScore = Math.round(metric.averageScore / metric.quizzesCompleted);
          // Score combines quiz performance with activity
          metric.score = Math.round((metric.averageScore * 0.7) + (Math.min(metric.quizzesCompleted * 5, 30)));
        }
      });

      // Process videos watched
      let totalVideos = 0;
      viewedContent?.forEach((progress: any) => {
        if (!progress.content) return;
        
        const categoryName = progress.content.category;
        const area = academicAreas.find(a => a.name === categoryName);
        
        if (area && areaMetrics[area.name]) {
          areaMetrics[area.name].videosWatched++;
        }
        
        totalVideos++;

        // Map to intelligences
        if (area && area.relatedIntelligences) {
          area.relatedIntelligences.forEach(intelName => {
            if (intelligenceMetrics[intelName]) {
              intelligenceMetrics[intelName].videosWatched++;
            }
          });
        }
      });

      // Calculate final scores for intelligences
      Object.keys(intelligenceMetrics).forEach(key => {
        const metric = intelligenceMetrics[key];
        if (metric.quizzesCompleted > 0) {
          metric.averageScore = Math.round(metric.averageScore / metric.quizzesCompleted);
          metric.score = Math.round(
            (metric.averageScore * 0.6) + 
            (Math.min(metric.quizzesCompleted * 3, 20)) + 
            (Math.min(metric.videosWatched * 2, 20))
          );
        } else if (metric.videosWatched > 0) {
          metric.score = Math.min(metric.videosWatched * 3, 30);
        }
      });

      const radarData = Object.values(areaMetrics);
      const intelligenceRadarData = Object.values(intelligenceMetrics);
      const overallAverage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

      return {
        radarData,
        intelligenceRadarData,
        totalVideos,
        totalQuizzes,
        overallAverage,
        totalStudents: students.length,
        areaMetrics,
        intelligenceMetrics,
      };
    },
    enabled: !!institutionId,
  });
};