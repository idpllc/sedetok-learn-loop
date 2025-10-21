import { useInstitution } from "@/hooks/useInstitution";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, BookOpen, ClipboardCheck, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { myMembership, isLoading: membershipLoading } = useInstitution();

  const { data: myStudents, isLoading: studentsLoading } = useQuery({
    queryKey: ["my-students", user?.id],
    queryFn: async () => {
      if (!user || !myMembership) return [];

      const { data, error } = await supabase
        .from("institution_members")
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq("institution_id", myMembership.institution_id)
        .eq("member_role", "student")
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!myMembership
  });

  const { data: stats } = useQuery({
    queryKey: ["teacher-stats", user?.id],
    queryFn: async () => {
      if (!user || !myMembership) return null;

      // Get content created by teacher
      const { count: contentCount } = await supabase
        .from("content")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", user.id)
        .eq("institution_id", myMembership.institution_id);

      // Get quizzes created by teacher
      const { count: quizzesCount } = await supabase
        .from("quizzes")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", user.id)
        .eq("institution_id", myMembership.institution_id);

      return {
        students: myStudents?.length || 0,
        contentCount: contentCount || 0,
        quizzesCount: quizzesCount || 0
      };
    },
    enabled: !!user && !!myMembership && !!myStudents
  });

  if (membershipLoading || studentsLoading) {
    return (
      <div className="container py-8 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!myMembership || myMembership.member_role !== "teacher") {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>No tienes permisos de profesor en ninguna institución</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <GraduationCap className="h-8 w-8" />
          Panel de Profesor
        </h1>
        <p className="text-muted-foreground mt-1">
          {myMembership.institution?.name}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Mis Estudiantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.students || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Contenidos Creados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.contentCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quizzes Creados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.quizzesCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">
            <GraduationCap className="mr-2 h-4 w-4" />
            Estudiantes
          </TabsTrigger>
          <TabsTrigger value="content">
            <BookOpen className="mr-2 h-4 w-4" />
            Mi Contenido
          </TabsTrigger>
          <TabsTrigger value="quizzes">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Mis Quizzes
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="mr-2 h-4 w-4" />
            Rendimiento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Mis Estudiantes ({myStudents?.length || 0})</CardTitle>
              <CardDescription>Estudiantes de la institución</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {myStudents?.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{student.profile?.full_name || student.profile?.username}</p>
                      <p className="text-sm text-muted-foreground">{student.profile?.username}</p>
                    </div>
                  </div>
                ))}
                {(!myStudents || myStudents.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay estudiantes registrados aún
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Mi Contenido</CardTitle>
              <CardDescription>Contenido que has creado para tus estudiantes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Próximamente...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quizzes">
          <Card>
            <CardHeader>
              <CardTitle>Mis Quizzes</CardTitle>
              <CardDescription>Evaluaciones que has creado</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Próximamente...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento de Estudiantes</CardTitle>
              <CardDescription>Analíticas y métricas de desempeño</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Próximamente...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
