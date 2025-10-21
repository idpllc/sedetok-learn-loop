import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, GraduationCap, Target, BookOpen, Brain, TrendingUp, Award } from "lucide-react";
import { useInstitutionAcademicMetrics } from "@/hooks/useInstitutionAcademicMetrics";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface InstitutionAnalyticsProps {
  institutionId: string;
}

export const InstitutionAnalytics = ({ institutionId }: InstitutionAnalyticsProps) => {
  // Get academic metrics
  const { data: academicMetrics, isLoading: loadingMetrics } = useInstitutionAcademicMetrics(institutionId);

  // Get global ranking data
  const { data: globalRanking, isLoading: loadingGlobal } = useQuery({
    queryKey: ["institution-global-ranking"],
    queryFn: async () => {
      const { data: institutions, error } = await supabase
        .from("institutions")
        .select("id, name, admin_user_id");

      if (error) throw error;

      const rankingsPromises = institutions.map(async (inst) => {
        const { data: xpPerCapita } = await supabase
          .rpc("calculate_institution_xp_per_capita", { p_institution_id: inst.id });

        return {
          id: inst.id,
          name: inst.name,
          xpPerCapita: Number(xpPerCapita) || 0
        };
      });

      const rankings = await Promise.all(rankingsPromises);
      return rankings.sort((a, b) => b.xpPerCapita - a.xpPerCapita);
    }
  });

  // Get internal rankings
  const { data: internalRankings, isLoading: loadingStudents } = useQuery({
    queryKey: ["institution-internal-rankings", institutionId],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("institution_members")
        .select(`
          user_id,
          member_role,
          profile:profiles(username, full_name, experience_points)
        `)
        .eq("institution_id", institutionId)
        .eq("status", "active");

      if (error) throw error;

      const students = members
        .filter(m => m.member_role === "student")
        .map(m => ({
          id: m.user_id,
          name: m.profile?.full_name || m.profile?.username || "Usuario",
          xp: m.profile?.experience_points || 0
        }))
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 10);

      const teachers = members
        .filter(m => m.member_role === "teacher")
        .map(m => ({
          id: m.user_id,
          name: m.profile?.full_name || m.profile?.username || "Usuario",
          xp: m.profile?.experience_points || 0
        }))
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 10);

      return { students, teachers };
    }
  });

  // Get achievements
  const { data: achievements, isLoading: loadingAchievements } = useQuery({
    queryKey: ["institution-achievements", institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institution_achievements")
        .select("*")
        .eq("institution_id", institutionId)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const currentRank = globalRanking?.findIndex((inst: any) => inst.id === institutionId) ?? -1;

  const chartConfig = {
    score: {
      label: "Desempeño",
      color: "hsl(var(--primary))",
    },
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 80) return { label: "Excelente", variant: "default" as const };
    if (score >= 60) return { label: "Bueno", variant: "secondary" as const };
    if (score >= 40) return { label: "Regular", variant: "outline" as const };
    return { label: "Por mejorar", variant: "destructive" as const };
  };

  if (loadingGlobal || loadingAchievements || loadingStudents || loadingMetrics) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Academic Performance Summary */}
      {academicMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Desempeño Promedio</CardDescription>
                <Target className="w-5 h-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <CardTitle className="text-3xl font-bold">{academicMetrics.overallAverage}%</CardTitle>
                <Badge variant={getPerformanceLevel(academicMetrics.overallAverage).variant} className="mb-1">
                  {getPerformanceLevel(academicMetrics.overallAverage).label}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Total Estudiantes</CardDescription>
                <Users className="w-5 h-5 text-secondary" />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-3xl font-bold">{academicMetrics.totalStudents}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Estudiantes activos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Videos Vistos</CardDescription>
                <BookOpen className="w-5 h-5 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-3xl font-bold">{academicMetrics.totalVideos}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Contenidos completados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Quizzes Completados</CardDescription>
                <Brain className="w-5 h-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-3xl font-bold">{academicMetrics.totalQuizzes}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Evaluaciones realizadas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Radar Charts */}
      {academicMetrics && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Perfil Académico Institucional por Áreas</CardTitle>
              <CardDescription>
                Desempeño agregado de todos los estudiantes en las diferentes áreas del conocimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={academicMetrics.radarData}>
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

          <Card>
            <CardHeader>
              <CardTitle>Perfil de Inteligencias Múltiples Institucional</CardTitle>
              <CardDescription>
                Identificación de las inteligencias desarrolladas por los estudiantes de la institución
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[500px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={academicMetrics.intelligenceRadarData}>
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
        </>
      )}

      {/* Global Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Ranking Global de Instituciones
          </CardTitle>
          <CardDescription>Basado en XP per cápita</CardDescription>
        </CardHeader>
        <CardContent>
          {currentRank >= 0 && globalRanking && (
            <div className="mb-4 p-4 bg-primary/10 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tu posición</p>
                  <p className="text-2xl font-bold">#{currentRank + 1}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">XP per cápita</p>
                  <p className="text-2xl font-bold">{globalRanking[currentRank].xpPerCapita.toFixed(0)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {globalRanking?.slice(0, 10).map((inst: any, index: number) => (
              <div
                key={inst.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  inst.id === institutionId ? 'bg-primary/20' : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg w-8">#{index + 1}</span>
                  <span>{inst.name}</span>
                </div>
                <Badge variant="secondary">{inst.xpPerCapita.toFixed(0)} XP</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Logros Institucionales
          </CardTitle>
          <CardDescription>Hitos alcanzados por tu institución</CardDescription>
        </CardHeader>
        <CardContent>
          {achievements && achievements.length > 0 ? (
            <div className="grid gap-3">
              {achievements.map((achievement) => (
                <div key={achievement.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="text-2xl">{achievement.icon || "🏆"}</div>
                  <div className="flex-1">
                    <p className="font-medium">{achievement.name}</p>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                  <Badge variant="outline">{achievement.threshold} XP</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Aún no has desbloqueado logros
            </p>
          )}
        </CardContent>
      </Card>

      {/* Internal Rankings */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Estudiantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {internalRankings?.students.map((student, index) => (
                <div key={student.id} className="flex items-center justify-between p-2 rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-bold w-6">#{index + 1}</span>
                    <span className="text-sm">{student.name}</span>
                  </div>
                  <Badge variant="secondary">{student.xp} XP</Badge>
                </div>
              ))}
              {(!internalRankings?.students || internalRankings.students.length === 0) && (
                <p className="text-center text-muted-foreground py-4">Sin estudiantes</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Profesores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {internalRankings?.teachers.map((teacher, index) => (
                <div key={teacher.id} className="flex items-center justify-between p-2 rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-bold w-6">#{index + 1}</span>
                    <span className="text-sm">{teacher.name}</span>
                  </div>
                  <Badge variant="secondary">{teacher.xp} XP</Badge>
                </div>
              ))}
              {(!internalRankings?.teachers || internalRankings.teachers.length === 0) && (
                <p className="text-center text-muted-foreground py-4">Sin profesores</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};