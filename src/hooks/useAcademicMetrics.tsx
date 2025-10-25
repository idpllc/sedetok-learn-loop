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

      // Ejecutar todas las queries en paralelo para mejor rendimiento
      const [watchedVideosResult, quizResultsResult, subjectResultsResult, likedContentResult, completedPathsResult] = await Promise.all([
        // 1. Videos vistos
        supabase
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
          .not("content_id", "is", null),
        
        // 2. Quizzes completados (internos)
        supabase
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
          .eq("user_id", userId),
        
        // 3. Resultados de asignaturas (externos - Sedefy Académico)
        supabase
          .from("user_subject_results")
          .select("*")
          .eq("user_id", userId),
        
        // 4. Likes en contenido
        supabase
          .from("likes")
          .select(`
            content_id,
            quiz_id,
            content:content_id (
              subject,
              category
            ),
            quiz:quiz_id (
              subject,
              category
            )
          `)
          .eq("user_id", userId),
        
        // 5. Rutas completadas
        supabase
          .from("user_path_progress")
          .select(`
            path_id,
            path:path_id (
              tipo_aprendizaje,
              subject,
              category
            )
          `)
          .eq("user_id", userId)
          .eq("completed", true)
          .not("path_id", "is", null)
      ]);

      const watchedVideos = watchedVideosResult.data;
      const quizResults = quizResultsResult.data;
      const subjectResults = subjectResultsResult.data;
      const likedContent = likedContentResult.data;
      const completedPaths = completedPathsResult.data;

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

      // Procesar quizzes completados (internos)
      if (quizResults) {
        quizResults.forEach((result: any) => {
          const subjectToUse = result.quiz?.subject || result.quiz?.category;
          if (subjectToUse && result.max_score && result.max_score > 0) {
            // Convertir score a porcentaje
            const scorePercentage = (result.score / result.max_score) * 100;
            
            // Para áreas académicas
            const areaId = getAreaForSubject(subjectToUse);
            if (areaId && areaMetrics[areaId]) {
              areaMetrics[areaId].quizzesCompleted++;
              areaMetrics[areaId].totalScore += scorePercentage;
              areaMetrics[areaId].quizCount++;
            }
            
            // Para inteligencias
            const intelligenceIds = getIntelligencesForSubject(subjectToUse);
            intelligenceIds.forEach(intId => {
              if (intelligenceMetrics[intId]) {
                intelligenceMetrics[intId].quizzesCompleted++;
                intelligenceMetrics[intId].totalScore += scorePercentage;
                intelligenceMetrics[intId].quizCount++;
              }
            });
          }
        });
      }

      // Procesar resultados de asignaturas (externos - Sedefy Académico)
      if (subjectResults) {
        subjectResults.forEach((result: any) => {
          // area_academica ya viene en formato estándar desde Sedefy
          const subjectToUse = result.area_academica;
          if (subjectToUse && result.max_score && result.max_score > 0) {
            // Convertir score a porcentaje
            const scorePercentage = (result.score / result.max_score) * 100;
            
            // Para áreas académicas
            const areaId = getAreaForSubject(subjectToUse);
            if (areaId && areaMetrics[areaId]) {
              areaMetrics[areaId].quizzesCompleted++;
              areaMetrics[areaId].totalScore += scorePercentage;
              areaMetrics[areaId].quizCount++;
            }
            
            // Para inteligencias
            const intelligenceIds = getIntelligencesForSubject(subjectToUse);
            intelligenceIds.forEach(intId => {
              if (intelligenceMetrics[intId]) {
                intelligenceMetrics[intId].quizzesCompleted++;
                intelligenceMetrics[intId].totalScore += scorePercentage;
                intelligenceMetrics[intId].quizCount++;
              }
            });
          }
        });
      }

      // Procesar likes en contenido
      if (likedContent) {
        likedContent.forEach((like: any) => {
          const subjectToUse = like.content?.subject || like.content?.category || 
                                like.quiz?.subject || like.quiz?.category;
          if (subjectToUse) {
            // Para áreas académicas - dar peso a los likes
            const areaId = getAreaForSubject(subjectToUse);
            if (areaId && areaMetrics[areaId]) {
              areaMetrics[areaId].videosWatched += 0.5; // Medio punto por like
            }
            
            // Para inteligencias
            const intelligenceIds = getIntelligencesForSubject(subjectToUse);
            intelligenceIds.forEach(intId => {
              if (intelligenceMetrics[intId]) {
                intelligenceMetrics[intId].videosWatched += 0.5; // Medio punto por like
              }
            });
          }
        });
      }

      // Procesar rutas completadas - mapear tipo_aprendizaje a inteligencias
      const tipoAprendizajeToIntelligence: Record<string, IntelligenceTypeId> = {
        'Lingüístico-Verbal': 'linguistico_verbal',
        'Lógico-Matemática': 'logico_matematica',
        'Visual-Espacial': 'visual_espacial',
        'Musical': 'musical',
        'Corporal-Kinestésica': 'corporal_kinestesica',
        'Interpersonal': 'interpersonal',
        'Intrapersonal': 'intrapersonal',
        'Naturalista': 'naturalista',
        'Existencial': 'existencial',
        'Creativa-Innovadora': 'creativa_innovadora',
        'Digital-Tecnológica': 'digital_tecnologica',
        'Emocional': 'emocional'
      };

      if (completedPaths) {
        completedPaths.forEach((pathProgress: any) => {
          const path = pathProgress.path;
          if (path) {
            // Procesar tipo de aprendizaje de la ruta
            if (path.tipo_aprendizaje) {
              const intelligenceId = tipoAprendizajeToIntelligence[path.tipo_aprendizaje];
              if (intelligenceId && intelligenceMetrics[intelligenceId]) {
                intelligenceMetrics[intelligenceId].videosWatched += 2; // 2 puntos por ruta completada
              }
            }

            // También procesar área académica de la ruta
            const subjectToUse = path.subject || path.category;
            if (subjectToUse) {
              const areaId = getAreaForSubject(subjectToUse);
              if (areaId && areaMetrics[areaId]) {
                areaMetrics[areaId].videosWatched += 2; // 2 puntos por ruta completada
              }
            }
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

        // Calcular score general del área
        const videoScore = Math.min((metrics.videosWatched * 10), 100);
        const quizScore = metrics.averageScore; // ya está en escala 0-100

        let overallScore: number;
        if (metrics.quizCount > 0 && metrics.videosWatched > 0) {
          // Si hay ambos, promediar 50/50
          overallScore = (videoScore * 0.5 + quizScore * 0.5);
        } else if (metrics.quizCount > 0) {
          // Solo quizzes, usar score de quizzes
          overallScore = quizScore;
        } else {
          // Solo videos
          overallScore = videoScore;
        }

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

        // Calcular score general
        const videoScore = Math.min((metrics.videosWatched * 10), 100);
        const quizScore = metrics.averageScore;

        let overallScore: number;
        if (metrics.quizCount > 0 && metrics.videosWatched > 0) {
          // Si hay ambos, promediar 50/50
          overallScore = (videoScore * 0.5 + quizScore * 0.5);
        } else if (metrics.quizCount > 0) {
          // Solo quizzes, usar score de quizzes
          overallScore = quizScore;
        } else {
          // Solo videos
          overallScore = videoScore;
        }

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
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // Mantener en cache por 10 minutos
  });
};
