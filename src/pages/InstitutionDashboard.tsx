import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInstitution } from "@/hooks/useInstitution";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, BookOpen, TrendingUp, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function InstitutionDashboard() {
  const navigate = useNavigate();
  const { myInstitution, members, isLoading, addMember } = useInstitution();
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<string>("student");

  const { data: stats } = useQuery({
    queryKey: ["institution-stats", myInstitution?.id],
    queryFn: async () => {
      if (!myInstitution) return null;

      const students = members?.filter(m => m.member_role === "student").length || 0;
      const teachers = members?.filter(m => m.member_role === "teacher").length || 0;
      const parents = members?.filter(m => m.member_role === "parent").length || 0;

      const { count: contentCount } = await (supabase as any)
        .from("content")
        .select("*", { count: "exact", head: true })
        .eq("institution_id", myInstitution.id);

      return {
        students,
        teachers,
        parents,
        contentCount: contentCount || 0
      };
    },
    enabled: !!myInstitution && !!members
  });

  const handleAddMember = async () => {
    if (!newMemberEmail) return;

    // Find user by email
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", newMemberEmail)
      .single();

    if (!profile) {
      alert("Usuario no encontrado");
      return;
    }

    addMember.mutate({
      userId: profile.id,
      memberRole: newMemberRole
    });

    setNewMemberEmail("");
  };

  if (isLoading) {
    return (
      <div className="container py-8 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!myInstitution) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>No tienes una institución registrada</CardTitle>
            <CardDescription>Registra tu institución para comenzar</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/register-institution")}>
              <Building2 className="mr-2 h-4 w-4" />
              Registrar Institución
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            {myInstitution.name}
          </h1>
          <p className="text-muted-foreground mt-1">{myInstitution.description}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.students || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Profesores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.teachers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Padres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.parents || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Contenidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.contentCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="mr-2 h-4 w-4" />
            Miembros
          </TabsTrigger>
          <TabsTrigger value="content">
            <BookOpen className="mr-2 h-4 w-4" />
            Contenido
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="mr-2 h-4 w-4" />
            Analíticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agregar Miembro</CardTitle>
              <CardDescription>Vincula estudiantes, profesores o padres a tu institución</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="email">Email o Username</Label>
                  <Input
                    id="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                  />
                </div>
                <div className="w-48">
                  <Label htmlFor="role">Rol</Label>
                  <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Estudiante</SelectItem>
                      <SelectItem value="teacher">Profesor</SelectItem>
                      <SelectItem value="parent">Padre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddMember} disabled={addMember.isPending}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Miembros Actuales ({members?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {members?.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{member.profile?.username || "Usuario"}</p>
                      <p className="text-sm text-muted-foreground">{member.profile?.full_name}</p>
                    </div>
                    <Badge variant="outline">{member.member_role}</Badge>
                  </div>
                ))}
                {(!members || members.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay miembros vinculados aún
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Contenido de la Institución</CardTitle>
              <CardDescription>Contenido creado por tus profesores</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Próximamente...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analíticas y Rendimiento</CardTitle>
              <CardDescription>Métricas de desempeño de estudiantes</CardDescription>
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
