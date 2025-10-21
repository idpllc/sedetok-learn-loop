import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Users, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface InstitutionAnalyticsProps {
  institutionId: string;
}

export function InstitutionAnalytics({ institutionId }: InstitutionAnalyticsProps) {
  const { data: globalRanking, isLoading: rankingLoading } = useQuery({
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

  const { data: internalRankings, isLoading: internalLoading } = useQuery({
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

  const { data: achievements, isLoading: achievementsLoading } = useQuery({
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

  const currentInstitutionRank = globalRanking?.findIndex(r => r.id === institutionId) ?? -1;
  const currentInstitution = globalRanking?.[currentInstitutionRank];

  if (rankingLoading || internalLoading || achievementsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          {currentInstitution && (
            <div className="mb-4 p-4 bg-primary/10 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tu posición</p>
                  <p className="text-2xl font-bold">#{currentInstitutionRank + 1}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">XP per cápita</p>
                  <p className="text-2xl font-bold">{currentInstitution.xpPerCapita.toFixed(0)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {globalRanking?.slice(0, 10).map((inst, index) => (
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
}
