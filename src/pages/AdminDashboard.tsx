import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useAdminStats } from "@/hooks/useAdminStats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Video, 
  FileText, 
  BookOpen, 
  HelpCircle, 
  Route, 
  Users,
  BarChart3,
  Settings,
  Home,
  Shield,
  Eye,
  Clock,
  CheckCircle2,
  MessageSquare,
  MessagesSquare,
  Building2,
} from "lucide-react";
import { ContentManagement } from "@/components/admin/ContentManagement";
import { UserManagement } from "@/components/admin/UserManagement";
import { ApiConfiguration } from "@/components/admin/ApiConfiguration";
import { VerificationManagement } from "@/components/admin/VerificationManagement";
import { InstitutionManagement } from "@/components/admin/InstitutionManagement";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isSuperAdmin, loading } = useSuperAdmin();
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const [activeTab, setActiveTab] = useState("overview");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background pt-20 md:pt-0">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 pt-24 md:pt-4">
        <Shield className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
        <p className="text-muted-foreground mb-6">No tienes permisos para acceder a esta página</p>
        <Button onClick={() => navigate("/")}>
          <Home className="w-4 h-4 mr-2" />
          Ir al Inicio
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 md:pt-0">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Shield className="w-8 h-8 text-primary" />
                Panel de Administración
              </h1>
              <p className="text-muted-foreground mt-1">Gestión completa del sistema</p>
            </div>
            <Button variant="outline" onClick={() => navigate("/")}>
              <Home className="w-4 h-4 mr-2" />
              Ir al Sitio
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Resumen</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Contenido</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Usuarios</span>
            </TabsTrigger>
            <TabsTrigger value="institutions" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Instituciones</span>
            </TabsTrigger>
            <TabsTrigger value="verification" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden sm:inline">Verificación</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? "..." : stats?.usersCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Total de usuarios registrados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Visitas</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? "..." : stats?.totalViews.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Visualizaciones totales</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Horas de Visualización</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? "..." : `${stats?.estimatedViewingHours}h`}
                  </div>
                  <p className="text-xs text-muted-foreground">Tiempo estimado de visualización</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Contenido Total</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? "..." : (stats?.videosCount || 0) + (stats?.documentsCount || 0) + (stats?.readingsCount || 0) + (stats?.quizzesCount || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Videos, docs, lecturas y quizzes</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Videos</CardTitle>
                  <Video className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? "..." : stats?.videosCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Total de videos publicados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Documentos</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? "..." : stats?.documentsCount}
                  </div>
                  <p className="text-xs text-muted-foreground">PDFs y documentos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Quizzes</CardTitle>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? "..." : stats?.quizzesCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Evaluaciones disponibles</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rutas</CardTitle>
                  <Route className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? "..." : stats?.pathsCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Rutas de aprendizaje</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Grupos de Chat</CardTitle>
                  <MessagesSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? "..." : stats?.chatGroupsCount.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Conversaciones y grupos creados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Mensajes Enviados</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? "..." : stats?.chatMessagesCount.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Total de mensajes en el sistema</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rutas Completadas</CardTitle>
                  <Route className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? "..." : stats?.completedPathsCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Rutas terminadas por usuarios</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Quizzes Completados</CardTitle>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? "..." : stats?.completedQuizzesCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Intentos de quizzes realizados</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
                <CardDescription>Últimas acciones en el sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span className="text-muted-foreground">Sistema funcionando correctamente</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content">
            <ContentManagement />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="institutions">
            <InstitutionManagement />
          </TabsContent>

          <TabsContent value="verification">
            <VerificationManagement />
          </TabsContent>

          <TabsContent value="settings">
            <ApiConfiguration />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
