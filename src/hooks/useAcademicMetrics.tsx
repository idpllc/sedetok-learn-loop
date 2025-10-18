import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { academicAreas, getAreaForSubject, AcademicAreaId } from "@/lib/academicAreas";
import { intelligenceTypes, getIntelligencesForSubject, IntelligenceTypeId } from "@/lib/intelligenceTypes";

export const useAcademicMetrics = (userId?: string) => {
  return useQuery({
    queryKey: ["academic-metrics", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");

      // Inicializar métricas por área
      const areaMetrics: Record<AcademicAreaId, {
        videosWatched: number;
        quizzesCompleted: number;
        totalScore: number;
        quizCount: number;
        averageScore: number;
      }> = {} as any;

      academicAreas.forEach(area => {
        areaMetrics[area.id] = {
          videosWatched: 0,
          quizzesCompleted: 0,
          totalScore: 0,
          quizCount: 0,
          averageScore: 0
        };
      });

      // Inicializar métricas por inteligencia
      const intelligenceMetrics: Record<IntelligenceTypeId, {
        videosWatched: number;
        quizzesCompleted: number;
        totalScore: number;
        quizCount: number;
        averageScore: number;
      }> = {} as any;

      intelligenceTypes.forEach(intelligence => {
        intelligenceMetrics[intelligence.id] = {
          videosWatched: 0,
          quizzesCompleted: 0,
          totalScore: 0,
          quizCount: 0,
          averageScore: 0
        };
      });

      // 1. Obtener videos vistos (basado en user_path_progress con completed = true)
      const { data: watchedVideos } = await supabase
        .from("user_path_progress")
        .select(`
          content_id,
          content:content_id (
            subject,
            category,
            content_type
          )
        `)
        .eq("user_id", userId)
        .eq("completed", true)
        .not("content_id", "is", null);

      // 2. Obtener quizzes completados
      const { data: quizResults } = await supabase
        .from("user_quiz_results")
        .select(`
          score,
          max_score,
          quiz_id,
          quiz:quiz_id (
            subject,
            category
          )
        `)
        .eq("user_id", userId);

      // Procesar videos vistos
      if (watchedVideos) {
        watchedVideos.forEach((item: any) => {
          const subjectToUse = item.content?.subject || item.content?.category;
          if (subjectToUse) {
            // Para áreas académicas
            const areaId = getAreaForSubject(subjectToUse);
            if (areaId && areaMetrics[areaId]) {
              areaMetrics[areaId].videosWatched++;
            }
            
            // Para inteligencias
            const intelligenceIds = getIntelligencesForSubject(subjectToUse);
            intelligenceIds.forEach(intId => {
              if (intelligenceMetrics[intId]) {
                intelligenceMetrics[intId].videosWatched++;
              }
            });
          }
        });
      }

      // Procesar quizzes completados
      if (quizResults) {
        quizResults.forEach((result: any) => {
          const subjectToUse = result.quiz?.subject || result.quiz?.category;
          if (subjectToUse) {
            // Para áreas académicas
            const areaId = getAreaForSubject(subjectToUse);
            if (areaId && areaMetrics[areaId]) {
              areaMetrics[areaId].quizzesCompleted++;
              areaMetrics[areaId].totalScore += result.score || 0;
              areaMetrics[areaId].quizCount++;
            }
            
            // Para inteligencias
            const intelligenceIds = getIntelligencesForSubject(subjectToUse);
            intelligenceIds.forEach(intId => {
              if (intelligenceMetrics[intId]) {
                intelligenceMetrics[intId].quizzesCompleted++;
                intelligenceMetrics[intId].totalScore += result.score || 0;
                intelligenceMetrics[intId].quizCount++;
              }
            });
          }
        });
      }

      // Calcular promedios y normalizar para gráfica de radar (0-100)
      const radarData = academicAreas.map(area => {
        const metrics = areaMetrics[area.id];
        
        // Calcular promedio de quiz si hay resultados
        if (metrics.quizCount > 0) {
          metrics.averageScore = metrics.totalScore / metrics.quizCount;
        }

        // Calcular score general del área (combinando videos y quizzes)
        // 50% peso videos, 50% peso quizzes
        const videoScore = Math.min((metrics.videosWatched * 10), 100); // 10 puntos por video, máx 100
        const quizScore = metrics.averageScore; // ya está en escala 0-100

        const overallScore = metrics.quizCount > 0 
          ? (videoScore * 0.5 + quizScore * 0.5)
          : videoScore;

        return {
          area: area.name,
          score: Math.round(overallScore),
          videosWatched: metrics.videosWatched,
          quizzesCompleted: metrics.quizzesCompleted,
          averageScore: Math.round(metrics.averageScore)
        };
      });

      // Calcular inteligencias
      const intelligenceRadarData = intelligenceTypes.map(intelligence => {
        const metrics = intelligenceMetrics[intelligence.id];
        
        // Calcular promedio de quiz si hay resultados
        if (metrics.quizCount > 0) {
          metrics.averageScore = metrics.totalScore / metrics.quizCount;
        }

        // Calcular score general (combinando videos y quizzes)
        const videoScore = Math.min((metrics.videosWatched * 10), 100);
        const quizScore = metrics.averageScore;

        const overallScore = metrics.quizCount > 0 
          ? (videoScore * 0.5 + quizScore * 0.5)
          : videoScore;

        return {
          intelligence: intelligence.name,
          icon: intelligence.icon,
          score: Math.round(overallScore),
          videosWatched: metrics.videosWatched,
          quizzesCompleted: metrics.quizzesCompleted,
          averageScore: Math.round(metrics.averageScore),
          description: intelligence.description
        };
      });

      // Calcular totales generales
      const totalVideos = Object.values(areaMetrics).reduce((sum, m) => sum + m.videosWatched, 0);
      const totalQuizzes = Object.values(areaMetrics).reduce((sum, m) => sum + m.quizzesCompleted, 0);
      const overallAverage = radarData.length > 0
        ? Math.round(radarData.reduce((sum, d) => sum + d.score, 0) / radarData.length)
        : 0;

      return {
        radarData,
        intelligenceRadarData,
        totalVideos,
        totalQuizzes,
        overallAverage,
        areaMetrics,
        intelligenceMetrics
      };
    },
    enabled: !!userId
  });
};
