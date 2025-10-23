import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInstitution } from "@/hooks/useInstitution";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, BookOpen, UserPlus, Settings, Home, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InstitutionSettings } from "@/components/institution/InstitutionSettings";
import { InstitutionAnalytics } from "@/components/institution/InstitutionAnalytics";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function InstitutionDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { myInstitution, members, isLoading, addMember } = useInstitution();
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<string>("student");
  const [searchQuery, setSearchQuery] = useState("");

  // Get current user's role in the institution
  const { data: currentUserRole } = useQuery({
    queryKey: ["current-user-role", myInstitution?.id],
    queryFn: async () => {
      if (!myInstitution) return null;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("institution_members")
        .select("member_role")
        .eq("institution_id", myInstitution.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (error) throw error;
      return data?.member_role;
    },
    enabled: !!myInstitution
  });

  const isAdmin = currentUserRole === "admin";
  const isTeacher = currentUserRole === "teacher";
  const isStudent = currentUserRole === "student";
  const isParent = currentUserRole === "parent";
  
  // Define permissions
  const canViewMembers = isAdmin || isTeacher;
  const canEditMembers = isAdmin;
  const canViewSettings = isAdmin;

  const { data: stats } = useQuery({
    queryKey: ["institution-stats", myInstitution?.id],
    queryFn: async () => {
      if (!myInstitution) return null;

      const students = members?.filter(m => m.member_role === "student").length || 0;
      const teachers = members?.filter(m => m.member_role === "teacher").length || 0;
      const parents = members?.filter(m => m.member_role === "parent").length || 0;
      const admins = members?.filter(m => m.member_role === "admin").length || 0;

      const { count: contentCount } = await (supabase as any)
        .from("content")
        .select("*", { count: "exact", head: true })
        .eq("institution_id", myInstitution.id);

      return {
        students,
        teachers,
        parents,
        admins,
        contentCount: contentCount || 0
      };
    },
    enabled: !!myInstitution && !!members
  });

  const handleAddMember = async () => {
    if (!newMemberEmail) return;

    try {
      // Use RPC to find user by email or username
      const { data: userId, error } = await supabase.rpc('find_user_by_email_or_username', {
        search_text: newMemberEmail
      });

      if (error) throw error;

      if (!userId) {
        toast({
          title: "Usuario no encontrado",
          description: "No existe un usuario con ese email o username",
          variant: "destructive"
        });
        return;
      }

      addMember.mutate({
        userId: userId,
        memberRole: newMemberRole
      });

      setNewMemberEmail("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo buscar el usuario",
        variant: "destructive"
      });
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("institution_members")
        .update({ member_role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Rol actualizado",
        description: "El rol del usuario se actualizó correctamente"
      });

      // Refresh members list
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el rol",
        variant: "destructive"
      });
    }
  };

  const filteredMembers = members?.filter(member => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const username = member.profile?.username?.toLowerCase() || "";
    const fullName = member.profile?.full_name?.toLowerCase() || "";
    return username.includes(query) || fullName.includes(query);
  });

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
    <div className="min-h-screen pb-8">
      {/* Cover Image */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/20 to-secondary/20">
        <div className="absolute inset-0 bg-cover bg-center" 
          style={myInstitution.cover_url ? { backgroundImage: `url(${myInstitution.cover_url})` } : {}} 
        />
      </div>

      <div className="container -mt-16 md:-mt-20 space-y-6">
        {/* Institution Header */}
        <div className="relative bg-card rounded-lg border shadow-sm p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-lg border-4 border-background bg-muted overflow-hidden">
                {myInstitution.logo_url ? (
                  <img 
                    src={myInstitution.logo_url} 
                    alt={myInstitution.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Institution Info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold">{myInstitution.name}</h1>
                  <p className="text-muted-foreground mt-1">{myInstitution.description}</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/")}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Inicio
                </Button>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                {myInstitution.created_at && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Fundada el {format(new Date(myInstitution.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })}</span>
                  </div>
                )}
                {myInstitution.city && myInstitution.country && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span>{myInstitution.city}, {myInstitution.country}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.admins || 0}</div>
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
            <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.students || 0}</div>
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

      <Tabs defaultValue="perfil" className="space-y-4">
        <TabsList>
          <TabsTrigger value="perfil">
            <Building2 className="mr-2 h-4 w-4" />
            Perfil
          </TabsTrigger>
          {canViewMembers && (
            <TabsTrigger value="members">
              <Users className="mr-2 h-4 w-4" />
              Miembros
            </TabsTrigger>
          )}
          <TabsTrigger value="content">
            <BookOpen className="mr-2 h-4 w-4" />
            Contenido
          </TabsTrigger>
          {canViewSettings && (
            <TabsTrigger value="settings">
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="perfil">
          <InstitutionAnalytics institutionId={myInstitution.id} />
        </TabsContent>

        {canViewMembers && (
          <TabsContent value="members" className="space-y-4">
            {canEditMembers && (
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
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="teacher">Profesor</SelectItem>
                          <SelectItem value="student">Estudiante</SelectItem>
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
            )}

            <Card>
              <CardHeader>
                <CardTitle>Miembros Actuales ({members?.length || 0})</CardTitle>
                <CardDescription>
                  {canEditMembers ? "Busca y gestiona los miembros de tu institución" : "Lista de miembros de la institución"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input
                    placeholder="Buscar por nombre o username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-md"
                  />
                </div>
                <div className="space-y-2">
                  {filteredMembers?.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <p className="font-medium">{member.profile?.username || "Usuario"}</p>
                        <p className="text-sm text-muted-foreground">{member.profile?.full_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {canEditMembers ? (
                          <Select
                            value={member.member_role}
                            onValueChange={(value) => handleRoleChange(member.id, value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="teacher">Profesor</SelectItem>
                              <SelectItem value="student">Estudiante</SelectItem>
                              <SelectItem value="parent">Padre</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline">{member.member_role}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!filteredMembers || filteredMembers.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      {searchQuery ? "No se encontraron miembros" : "No hay miembros vinculados aún"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Contenido de la Institución</CardTitle>
              <CardDescription>Crea y gestiona contenido educativo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => navigate("/create-content")} className="w-full">
                <BookOpen className="mr-2 h-4 w-4" />
                Crear Nuevo Contenido
              </Button>
              <p className="text-center text-muted-foreground text-sm">
                Total de contenidos: {stats?.contentCount || 0}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {canViewSettings && (
          <TabsContent value="settings">
            <InstitutionSettings 
              institutionId={myInstitution.id}
              institution={myInstitution}
            />
          </TabsContent>
        )}
      </Tabs>
      </div>
    </div>
  );
}
