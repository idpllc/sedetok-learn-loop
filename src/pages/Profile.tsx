import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Video, FileText, HelpCircle, Trash2, Edit, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useUserContent } from "@/hooks/useUserContent";
import { Skeleton } from "@/components/ui/skeleton";

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userContent, isLoading, deleteMutation, updateMutation } = useUserContent();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<string | null>(null);

  const handleDelete = (contentId: string) => {
    setContentToDelete(contentId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (contentToDelete) {
      deleteMutation.mutate(contentToDelete);
      setDeleteDialogOpen(false);
      setContentToDelete(null);
    }
  };

  const toggleVisibility = (contentId: string, isPublic: boolean) => {
    updateMutation.mutate({
      contentId,
      updates: { is_public: !isPublic }
    });
  };

  const videoContent = userContent?.filter(c => c.content_type === "video") || [];
  const documentContent = userContent?.filter(c => c.content_type === "document") || [];
  const quizContent = userContent?.filter(c => c.content_type === "quiz") || [];

  const ContentItem = ({ item }: { item: any }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {item.description || "Sin descripción"}
            </CardDescription>
          </div>
          <div className="flex gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleVisibility(item.id, item.is_public)}
              title={item.is_public ? "Ocultar" : "Publicar"}
            >
              {item.is_public ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/edit/${item.id}`)}
              title="Editar"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(item.id)}
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.thumbnail_url && (
          <img 
            src={item.thumbnail_url} 
            alt={item.title}
            className="w-full h-48 object-cover rounded-md"
          />
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">{item.category}</Badge>
          <Badge variant="outline">{item.grade_level}</Badge>
          {!item.is_public && (
            <Badge variant="destructive">No publicado</Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>❤️ {item.likes_count || 0}</span>
          <span>💬 {item.comments_count || 0}</span>
          <span>👁️ {item.views_count || 0}</span>
          <span>🔖 {item.saves_count || 0}</span>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center gap-3 max-w-6xl mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Mi Perfil</h1>
          </div>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Mi Perfil</h1>
            <p className="text-sm text-muted-foreground">
              {user?.user_metadata?.username || user?.email}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl font-bold text-center">
                {userContent?.length || 0}
              </CardTitle>
              <CardDescription className="text-center">Total cápsulas</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl font-bold text-center">
                {userContent?.reduce((sum, c) => sum + (c.likes_count || 0), 0) || 0}
              </CardTitle>
              <CardDescription className="text-center">Total likes</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl font-bold text-center">
                {userContent?.reduce((sum, c) => sum + (c.views_count || 0), 0) || 0}
              </CardTitle>
              <CardDescription className="text-center">Total vistas</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl font-bold text-center">
                {userContent?.reduce((sum, c) => sum + (c.saves_count || 0), 0) || 0}
              </CardTitle>
              <CardDescription className="text-center">Total guardados</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Content tabs */}
        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Videos ({videoContent.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documentos ({documentContent.length})
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Quizzes ({quizContent.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {videoContent.length > 0 ? (
                videoContent.map((item) => <ContentItem key={item.id} item={item} />)
              ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No tienes videos aún</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {documentContent.length > 0 ? (
                documentContent.map((item) => <ContentItem key={item.id} item={item} />)
              ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No tienes documentos aún</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="quizzes" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {quizContent.length > 0 ? (
                quizContent.map((item) => <ContentItem key={item.id} item={item} />)
              ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No tienes quizzes aún</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El contenido será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Profile;
