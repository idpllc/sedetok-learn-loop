import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAcademicMetrics } from "@/hooks/useAcademicMetrics";
import { useInstitutionAcademicMetrics } from "@/hooks/useInstitutionAcademicMetrics";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BookOpen, Brain, Target, TrendingUp, Building2, GraduationCap, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { WorkExperience } from "@/components/profile/WorkExperience";
import { ProjectsSection } from "@/components/profile/ProjectsSection";
import { SkillsSection } from "@/components/profile/SkillsSection";
import { EducationSection } from "@/components/profile/EducationSection";
import { CVGenerator } from "@/components/profile/CVGenerator";
import { VocationalProfile } from "@/components/profile/VocationalProfile";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ProfessionalProfileProps {
  userId?: string;
}

export const ProfessionalProfile = ({ userId }: ProfessionalProfileProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: metrics, isLoading } = useAcademicMetrics(userId);
  const isOwnProfile = user?.id === userId;

  const { data: profile, refetch: refetchProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile-full", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        throw error;
      }
      
      // Incrementar vistas en background sin bloquear la carga
      if (!isOwnProfile && user) {
        void supabase
          .from("profiles")
          .update({ profile_views: (data.profile_views || 0) + 1 })
          .eq("id", userId);
      }
      
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const handleUpdateCover = async (url: string) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "No se pudo identificar el usuario",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ cover_image_url: url })
        .eq("id", userId);
        
      if (error) throw error;
      
      await refetchProfile();
    } catch (error) {
      console.error("Error updating cover:", error);
      toast({
        title: "Error al actualizar portada",
        description: "No se pudo guardar la imagen en el perfil",
        variant: "destructive"
      });
    }
  };

  const handleUpdateAvatar = async (url: string) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "No se pudo identificar el usuario",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", userId);
        
      if (error) throw error;
      
      await refetchProfile();
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast({
        title: "Error al actualizar foto",
        description: "No se pudo guardar la imagen en el perfil",
        variant: "destructive"
      });
    }
  };

  // Get user's institution con caching mejorado
  const { data: institutionMember } = useQuery({
    queryKey: ["user-institution", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("institution_members")
        .select("institution_id, institutions(name)")
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutos - esto cambia raramente
  });

  const { data: institutionMetrics, isLoading: isLoadingInstitution } = useInstitutionAcademicMetrics(
    institutionMember?.institution_id
  );

  if (isLoading || profileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Brain className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hay datos académicos disponibles</p>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    score: {
      label: "Desempeño",
      color: "hsl(var(--primary))",
    },
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 80) return { label: "Excelente", variant: "default" as const, color: "bg-green-500" };
    if (score >= 60) return { label: "Bueno", variant: "secondary" as const, color: "bg-blue-500" };
    if (score >= 40) return { label: "Regular", variant: "outline" as const, color: "bg-yellow-500" };
    return { label: "Por mejorar", variant: "destructive" as const, color: "bg-orange-500" };
  };

  const performance = getPerformanceLevel(metrics.overallAverage);

  return (
    <div className="space-y-6">
      {/* Header del Perfil */}
      {profile && (
        <ProfileHeader 
          profile={profile} 
          isOwnProfile={isOwnProfile}
          onUpdateCover={handleUpdateCover}
          onUpdateAvatar={handleUpdateAvatar}
        />
      )}

      {/* Habilidades - Movidas arriba */}
      {profile?.skills && Array.isArray(profile.skills) && (
        <SkillsSection skills={profile.skills as any[]} />
      )}

      {/* Generador de CV - Ancho completo - Solo visible para el dueño */}
      {profile && isOwnProfile && (
        <CVGenerator profile={profile} metrics={metrics} isOwnProfile={isOwnProfile} />
      )}

      {/* Educación Formal */}
      {profile?.education && Array.isArray(profile.education) && profile.education.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Educación Formal</CardTitle>
            <CardDescription>Formación académica y títulos obtenidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {profile.education.map((edu: any, index: number) => (
                <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                  <GraduationCap className="w-8 h-8 text-primary mt-1" />
                  <div className="flex-1 space-y-2">
                    <div>
                      <h4 className="font-semibold">{edu.degree} en {edu.field_of_study}</h4>
                      <p className="text-sm text-muted-foreground">{edu.institution}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{edu.start_date}</span>
                      <span>-</span>
                      <span>{edu.currently_studying ? "Presente" : edu.end_date}</span>
                    </div>
                    {edu.description && (
                      <p className="text-sm mt-2">{edu.description}</p>
                    )}
                    {edu.certificate_url && (
                      <a 
                        href={edu.certificate_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Ver certificado →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Experiencia Laboral */}
      {profile?.work_experience && Array.isArray(profile.work_experience) && (
        <WorkExperience experiences={profile.work_experience as any[]} />
      )}

      {/* Proyectos */}
      {profile?.projects && Array.isArray(profile.projects) && (
        <ProjectsSection projects={profile.projects as any[]} />
      )}

      {/* Formación Complementaria */}
      <EducationSection 
        userId={userId}
        complementaryEducation={profile?.complementary_education && Array.isArray(profile.complementary_education) ? profile.complementary_education as any[] : undefined}
      />

      {/* Métricas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Desempeño General</CardDescription>
              <Target className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <CardTitle className="text-3xl font-bold">{metrics.overallAverage}%</CardTitle>
              <Badge variant={performance.variant} className="mb-1">
                {performance.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Videos Completados</CardDescription>
              <BookOpen className="w-5 h-5 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl font-bold">{metrics.totalVideos}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Contenidos visualizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Quizzes Completados</CardDescription>
              <Brain className="w-5 h-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl font-bold">{metrics.totalQuizzes}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Evaluaciones realizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Áreas Evaluadas</CardDescription>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl font-bold">
              {metrics.radarData.filter(d => d.score > 0).length}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">De 8 áreas académicas</p>
          </CardContent>
        </Card>
      </div>


      {/* Gráfica de Radar - Áreas Académicas Personales */}
      <Card>
        <CardHeader>
          <CardTitle>{isOwnProfile ? "Tu Perfil Académico por Áreas" : "Perfil Académico por Áreas"}</CardTitle>
          <CardDescription>
            {isOwnProfile 
              ? "Visualización de tu desempeño personal en las diferentes áreas del conocimiento"
              : "Visualización del desempeño en las diferentes áreas del conocimiento"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={metrics.radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis 
                  dataKey="area" 
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Radar
                  name="Desempeño"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Gráfica de Radar - Inteligencias Múltiples */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil de Inteligencias Múltiples</CardTitle>
          <CardDescription>
            {isOwnProfile 
              ? "Identificación de tus 12 tipos de inteligencia basada en tu actividad académica"
              : "Identificación de los 12 tipos de inteligencia basada en la actividad académica"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={metrics.intelligenceRadarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis 
                  dataKey="intelligence" 
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Radar
                  name="Nivel"
                  dataKey="score"
                  stroke="hsl(var(--secondary))"
                  fill="hsl(var(--secondary))"
                  fillOpacity={0.3}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Detalles por Inteligencia */}
      <Card>
        <CardHeader>
          <CardTitle>{isOwnProfile ? "Tus Inteligencias Dominantes" : "Inteligencias Dominantes"}</CardTitle>
          <CardDescription>
            {isOwnProfile 
              ? "Análisis detallado de tus fortalezas según las inteligencias múltiples"
              : "Análisis detallado de las fortalezas según las inteligencias múltiples"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.intelligenceRadarData
              .filter(intel => intel.score > 0)
              .sort((a, b) => b.score - a.score)
              .map((intel, index) => {
                const intelPerformance = getPerformanceLevel(intel.score);
                return (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                    <div className="text-4xl">{intel.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{intel.intelligence}</h4>
                        <Badge variant={intelPerformance.variant} className="text-xs">
                          {intel.score}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{intel.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>📹 {intel.videosWatched}</span>
                        <span>📝 {intel.quizzesCompleted}</span>
                        {intel.quizzesCompleted > 0 && (
                          <span>📊 {intel.averageScore}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
          
          {metrics.intelligenceRadarData.filter(intel => intel.score === 0).length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-semibold mb-3 text-muted-foreground">Inteligencias por desarrollar</h4>
              <div className="flex flex-wrap gap-2">
                {metrics.intelligenceRadarData
                  .filter(intel => intel.score === 0)
                  .map((intel, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      {intel.icon} {intel.intelligence}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalles por Área */}
      <Card>
        <CardHeader>
          <CardTitle>Desempeño Detallado por Área</CardTitle>
          <CardDescription>
            Estadísticas específicas de cada área académica
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.radarData
              .filter(area => area.score > 0)
              .sort((a, b) => b.score - a.score)
              .map((area, index) => {
                const areaPerformance = getPerformanceLevel(area.score);
                return (
                  <div key={index} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                    <div className={`w-12 h-12 rounded-full ${areaPerformance.color} flex items-center justify-center text-white font-bold`}>
                      {area.score}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{area.area}</h4>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>📹 {area.videosWatched} videos</span>
                        <span>📝 {area.quizzesCompleted} quizzes</span>
                        {area.quizzesCompleted > 0 && (
                          <span>📊 {area.averageScore}% promedio</span>
                        )}
                      </div>
                    </div>
                    <Badge variant={areaPerformance.variant}>
                      {areaPerformance.label}
                    </Badge>
                  </div>
                );
              })}
          </div>
          
          {metrics.radarData.filter(area => area.score === 0).length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-semibold mb-3 text-muted-foreground">Áreas sin actividad</h4>
              <div className="flex flex-wrap gap-2">
                {metrics.radarData
                  .filter(area => area.score === 0)
                  .map((area, index) => (
                    <Badge key={index} variant="outline">
                      {area.area}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vocational Profile Section */}
      {isOwnProfile && metrics && (
        <VocationalProfile 
          areaMetrics={metrics.areaMetrics}
          intelligenceMetrics={metrics.intelligenceMetrics}
          userProfile={profile}
        />
      )}

    </div>
  );
};
