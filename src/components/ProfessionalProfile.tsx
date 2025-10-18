import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAcademicMetrics } from "@/hooks/useAcademicMetrics";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BookOpen, Brain, Target, TrendingUp } from "lucide-react";

interface ProfessionalProfileProps {
  userId?: string;
}

export const ProfessionalProfile = ({ userId }: ProfessionalProfileProps) => {
  const { data: metrics, isLoading } = useAcademicMetrics(userId);

  if (isLoading) {
    return (
      <div className="space-y-6">
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

      {/* Gráfica de Radar */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil Académico por Áreas</CardTitle>
          <CardDescription>
            Visualización de tu desempeño en las diferentes áreas del conocimiento
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
    </div>
  );
};
