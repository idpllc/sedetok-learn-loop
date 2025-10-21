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

      // Mapping from database area_academica values to our academic areas
      const areaMapping: Record<string, string> = {
        'Informática': 'Tecnología e Informática',
        'Tecnología': 'Tecnología e Informática',
        'Arte': 'Educación Artística',
        'Artes': 'Educación Artística',
        'Música': 'Educación Artística',
        'Teatro': 'Educación Artística',
        'Danza': 'Educación Artística',
        'Deportes': 'Educación Física',
        'Educación Física': 'Educación Física',
        'Biología': 'Ciencias Naturales',
        'Física': 'Ciencias Naturales',
        'Química': 'Ciencias Naturales',
        'Ciencias Naturales': 'Ciencias Naturales',
        'Literatura': 'Lengua Castellana',
        'Lengua Castellana': 'Lengua Castellana',
        'Español': 'Lengua Castellana',
        'Lectura': 'Lengua Castellana',
        'Inglés': 'Lenguas Extranjeras',
        'Francés': 'Lenguas Extranjeras',
        'Portugués': 'Lenguas Extranjeras',
        'Matemáticas': 'Matemáticas',
        'Geometría': 'Matemáticas',
        'Álgebra': 'Matemáticas',
        'Estadística': 'Matemáticas',
        'Historia': 'Ciencias Sociales',
        'Geografía': 'Ciencias Sociales',
        'Filosofía': 'Ciencias Sociales',
        'Ética': 'Ciencias Sociales',
        'Ciencias Sociales': 'Ciencias Sociales',
        'Medicina': 'Ciencias Naturales',
      };

      // Get all students from the institution using a SECURITY DEFINER RPC to bypass RLS listing limitations
      const { data: students, error: studentsError } = await supabase
        .rpc('get_institution_student_ids', { p_institution_id: institutionId });

      if (studentsError) throw studentsError;
      if (!students || students.length === 0) return null;

      const studentIds = students.map((s: any) => s.user_id);
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

      console.log("Processing quiz results...");
      
      quizResults?.forEach(result => {
        const dbAreaName = result.area_academica;
        
        console.log(`Quiz area from DB: "${dbAreaName}"`);
        
        // Map the database area to our standard academic area
        const mappedAreaName = dbAreaName ? areaMapping[dbAreaName] || dbAreaName : "Otras";
        
        console.log(`Mapped to: "${mappedAreaName}"`);
        
        if (areaMetrics[mappedAreaName]) {
          areaMetrics[mappedAreaName].quizzesCompleted++;
          const percentage = (result.score / result.max_score) * 100;
          areaMetrics[mappedAreaName].averageScore += percentage;
        } else {
          console.warn(`Area "${mappedAreaName}" not found in metrics. Available areas:`, Object.keys(areaMetrics));
        }

        totalQuizzes++;
        totalScore += result.score;
        totalMaxScore += result.max_score;

        // Map to intelligences
        const area = academicAreas.find(a => a.name === mappedAreaName);
        if (area && area.relatedIntelligences) {
          area.relatedIntelligences.forEach(intelName => {
            if (intelligenceMetrics[intelName]) {
              intelligenceMetrics[intelName].quizzesCompleted++;
              const percentage = (result.score / result.max_score) * 100;
              intelligenceMetrics[intelName].averageScore += percentage;
            }
          });
        }
      });

      console.log("Quiz processing complete. Area metrics:", areaMetrics);

      // Calculate average scores and final scores for areas
      Object.keys(areaMetrics).forEach(key => {
        const metric = areaMetrics[key];
        if (metric.quizzesCompleted > 0) {
          metric.averageScore = Math.round(metric.averageScore / metric.quizzesCompleted);
          const activityBonus = Math.min(metric.quizzesCompleted * 2, 10);
          metric.score = Math.min(Math.round(metric.averageScore + activityBonus), 100);
          
          console.log(`${key}: ${metric.quizzesCompleted} quizzes, avg: ${metric.averageScore}%, score: ${metric.score}`);
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
          // Calculate the true average score
          metric.averageScore = Math.round(metric.averageScore / metric.quizzesCompleted);
          // Intelligence score based primarily on performance with small activity bonuses
          const quizBonus = Math.min(metric.quizzesCompleted * 1.5, 10);
          const videoBonus = Math.min(metric.videosWatched * 1, 5);
          metric.score = Math.min(Math.round(metric.averageScore + quizBonus + videoBonus), 100);
        } else if (metric.videosWatched > 0) {
          // If only videos watched, give minimal score
          metric.score = Math.min(metric.videosWatched * 2, 20);
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