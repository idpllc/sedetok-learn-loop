import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Video, FileText, HelpCircle, Trash2, Edit, UserCog, Sparkles, LogOut, UserPlus, UserCheck, BookOpen, Map, Briefcase, Heart, Bookmark, Share2, Camera, GraduationCap, ClipboardList } from "lucide-react";
import { getUserLevel } from "@/lib/xpLevels";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useOnboardingTrigger } from "@/hooks/useOnboardingTrigger";
import { PDFViewer } from "@/components/PDFViewer";
import { PDFModal } from "@/components/PDFModal";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useLearningPaths } from "@/hooks/useLearningPaths";
import { useFollow } from "@/hooks/useFollow";
import { useUserActivity } from "@/hooks/useUserActivity";
import { useProfileUpdate } from "@/hooks/useProfileUpdate";
import { useCloudinary } from "@/hooks/useCloudinary";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getQuizScientistIcon } from "@/lib/quizScientists";

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useParams();
  const { user, loading: authLoading, signOut } = useAuth();
  const isOwnProfile = !userId || userId === user?.id;
  const { userContent, isLoading, deleteMutation, updateMutation } = useUserContent(userId);
  const { paths: learningPaths, isLoading: pathsLoading, deletePath } = useLearningPaths(userId || user?.id, 'created');
  const { isFollowing, toggleFollow, isProcessing } = useFollow(userId || "");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<string | null>(null);
  const [pathToDelete, setPathToDelete] = useState<string | null>(null);
  const [deletePathDialogOpen, setDeletePathDialogOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<{ url: string; title: string } | null>(null);
  const { shouldShowOnboarding, initialStep, openOnboarding, closeOnboarding } = useOnboardingTrigger();
  const { likedContent, savedContent, sharedContent, isLoading: activityLoading } = useUserActivity();
  const { updateProfile } = useProfileUpdate();
  const { uploadFile, uploading } = useCloudinary();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profileData } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const targetUserId = userId || user?.id;
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetUserId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId || !!user?.id,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  const handleExpandPdf = (url: string, title: string) => {
    setSelectedPdf({ url, title });
    setPdfModalOpen(true);
  };

  useEffect(() => {
    if (!authLoading && !user && isOwnProfile) {
      navigate("/auth", { state: { from: location.pathname } });
    }
  }, [user, authLoading, navigate, isOwnProfile, location]);

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

  const handleDeletePath = (pathId: string) => {
    setPathToDelete(pathId);
    setDeletePathDialogOpen(true);
  };

  const confirmDeletePath = () => {
    if (pathToDelete) {
      deletePath.mutate(pathToDelete);
      setDeletePathDialogOpen(false);
      setPathToDelete(null);
    }
  };

  const toggleVisibility = (contentId: string, isPublic: boolean) => {
    updateMutation.mutate({
      contentId,
      updates: { is_public: !isPublic }
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen debe ser menor a 5MB");
      return;
    }

    try {
      const imageUrl = await uploadFile(file);
      await updateProfile({ avatar_url: imageUrl });
      toast.success("Foto de perfil actualizada");
    } catch (error) {
      toast.error("Error al actualizar la foto de perfil");
    }
  };

  const videoContent = userContent?.filter(c => c.content_type === "video") || [];
  const documentContent = userContent?.filter(c => c.content_type === "document") || [];
  const readingContent = userContent?.filter(c => c.content_type === "lectura") || [];
  const quizContent = userContent?.filter(c => c.content_type === "quiz") || [];

  const PathItem = ({ path }: { path: any }) => (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/learning-paths/${path.id}`)}
    >
      <div className="relative">
        <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20">
          {path.thumbnail_url || path.cover_url ? (
            <img 
              src={path.thumbnail_url || path.cover_url} 
              alt={path.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Map className="w-12 h-12" />
            </div>
          )}
        </div>
        
        {isOwnProfile && (
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-foreground/90 backdrop-blur-sm hover:bg-foreground text-background"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/learning-paths/edit/${path.id}`);
              }}
              title="Editar"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeletePath(path.id);
              }}
              title="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <CardHeader className="space-y-2 p-4">
        <CardTitle className="text-base line-clamp-2">{path.title}</CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {path.description || "Sin descripción"}
        </CardDescription>
        
        <div className="flex items-center gap-2 flex-wrap pt-2">
          <Badge variant="secondary" className="text-xs">{path.subject || path.category}</Badge>
          <Badge variant="outline" className="text-xs">{path.grade_level}</Badge>
          <Badge variant="outline" className="text-xs">{path.level || "Básico"}</Badge>
          {!path.is_public && (
            <Badge variant="destructive" className="text-xs">Privado</Badge>
          )}
          {path.status === 'draft' && (
            <Badge variant="secondary" className="text-xs">Borrador</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            📚 <span className="text-foreground font-medium">{path.estimated_duration || 0} min</span>
          </span>
          <span className="flex items-center gap-1">
            ⭐ <span className="text-foreground font-medium">{path.total_xp || 0} XP</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );

  const ContentItem = ({ item, hideActions = false }: { item: any; hideActions?: boolean }) => {
    const scientist = item.content_type === 'quiz' ? getQuizScientistIcon(item.category) : null;
    
    const handleContentClick = () => {
      navigate(`/creator/${userId || user?.id}/content?content=${item.id}`);
    };
    
    return (
      <Card 
        className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
        onClick={handleContentClick}
      >
        <div className="relative">
          {/* Thumbnail/Preview */}
          <div className="relative aspect-video w-full overflow-hidden bg-muted">
            {item.content_type === "document" && item.thumbnail_url ? (
              <img 
                src={item.thumbnail_url} 
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : item.content_type === "quiz" && scientist ? (
              <div className="w-full h-full bg-gradient-to-br from-purple-500/30 via-pink-500/30 to-blue-500/30 flex items-center justify-center">
                <img 
                  src={scientist.icon} 
                  alt={scientist.name}
                  className="w-24 h-24 rounded-full border-4 border-white/30 object-cover"
                />
              </div>
            ) : item.thumbnail_url ? (
              <img 
                src={item.thumbnail_url} 
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                {item.content_type === "video" && <Video className="w-12 h-12" />}
                {item.content_type === "document" && <FileText className="w-12 h-12" />}
                {item.content_type === "lectura" && <BookOpen className="w-12 h-12" />}
                {item.content_type === "quiz" && <HelpCircle className="w-12 h-12" />}
              </div>
            )}
          </div>
          
          {/* Action buttons overlay */}
          {isOwnProfile && !hideActions && (
            <div className="absolute top-2 right-2 flex gap-1">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-foreground/90 backdrop-blur-sm hover:bg-foreground text-background"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/edit/${item.id}`);
                }}
                title="Editar"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id);
                }}
                title="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <CardHeader className="space-y-2 p-4">
          <CardTitle className="text-base line-clamp-2">{item.title}</CardTitle>
          <CardDescription className="text-sm line-clamp-2">
            {item.description || "Sin descripción"}
          </CardDescription>
          
          {/* Tags */}
          <div className="flex items-center gap-2 flex-wrap pt-2">
            <Badge variant="secondary" className="text-xs">{item.subject || item.category}</Badge>
            <Badge variant="outline" className="text-xs">{item.grade_level}</Badge>
            {!item.is_public && (
              <Badge variant="destructive" className="text-xs">Privado</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                ❤️ <span className="text-foreground font-medium">{item.likes_count || 0}</span>
              </span>
              <span className="flex items-center gap-1">
                💬 <span className="text-foreground font-medium">{item.comments_count || 0}</span>
              </span>
              <span className="flex items-center gap-1">
                👁️ <span className="text-foreground font-medium">{item.views_count || 0}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                🔖 <span className="text-foreground font-medium">{item.saves_count || 0}</span>
              </span>
              <span className="flex items-center gap-1">
                🔗 <span className="text-foreground font-medium">{item.shares_count || 0}</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (authLoading || !user) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen bg-background flex items-center justify-center md:ml-64 pt-20 md:pt-0">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4 animate-pulse">📚</div>
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen bg-background pb-20 md:ml-64 pt-20 md:pt-0">
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
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-background pb-20 md:ml-64 pt-20 md:pt-0">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{isOwnProfile ? "Mi Perfil" : profileData?.username || "Perfil"}</h1>
            <p className="text-sm text-muted-foreground">
              {isOwnProfile 
                ? (user?.user_metadata?.username || user?.email)
                : (profileData?.full_name || profileData?.username || "Usuario")
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isOwnProfile ? (
              <>
                {profileData?.id_sede && (
                  <Button variant="secondary" size="sm" onClick={() => navigate("/institution-dashboard")} className="flex items-center gap-2">
                    <Map className="w-4 h-4" />
                    <span className="hidden md:inline">Mi Institución</span>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => navigate("/profile/edit")} className="flex items-center gap-2">
                  <UserCog className="w-4 h-4" />
                  <span className="hidden md:inline">Editar</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Salir</span>
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => navigate(`/profile/professional/${userId}`)}
                  className="flex items-center gap-2"
                >
                  <Briefcase className="w-4 h-4" />
                  <span className="hidden md:inline">Perfil Profesional</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => toggleFollow(userId!)}
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Siguiendo</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Seguir</span>
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Profile Summary Card with Level */}
        {profileData && (
          <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Avatar className="w-20 h-20 border-4 border-primary/20">
                    <AvatarImage src={profileData.avatar_url || ""} alt={profileData.username} />
                    <AvatarFallback className="text-2xl">
                      {profileData.username?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {isOwnProfile && (
                    <>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                      >
                        <Camera className="w-6 h-6 text-white" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </>
                  )}
                </div>
                <div className="text-5xl">
                  {getUserLevel(profileData.experience_points || 0).icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-1">
                    {getUserLevel(profileData.experience_points || 0).level}
                  </h2>
                  <p className="text-lg text-muted-foreground mb-2">
                    {(profileData.experience_points || 0).toLocaleString()} XP
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {getUserLevel(profileData.experience_points || 0).benefits.map((benefit, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {benefit}
                      </Badge>
                    ))}
                  </div>
                </div>
                {isOwnProfile && (
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => navigate("/profile/professional")} 
                      className="flex items-center gap-2"
                    >
                      <Briefcase className="w-4 h-4" />
                      <span>Mi Perfil Profesional</span>
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => navigate("/profile/professional#vocational")} 
                      className="flex items-center gap-2"
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>Mi Perfil Vocacional</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate("/cv-variations")} 
                      className="flex items-center gap-2"
                    >
                      <ClipboardList className="w-4 h-4" />
                      <span>Mis Hojas de Vida</span>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2 md:pb-3 px-2 md:px-6 pt-2 md:pt-6">
              <CardTitle className="text-lg md:text-2xl font-bold text-center">
                {userContent?.length || 0}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-center">Cápsulas</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2 md:pb-3 px-2 md:px-6 pt-2 md:pt-6">
              <CardTitle className="text-lg md:text-2xl font-bold text-center">
                {userContent?.reduce((sum, c) => sum + (c.likes_count || 0), 0) || 0}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-center">Likes</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2 md:pb-3 px-2 md:px-6 pt-2 md:pt-6">
              <CardTitle className="text-lg md:text-2xl font-bold text-center">
                {userContent?.reduce((sum, c) => sum + (c.views_count || 0), 0) || 0}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-center">Vistas</CardDescription>
            </CardHeader>
          </Card>
          <Card className="hidden md:block">
            <CardHeader className="pb-2 md:pb-3 px-2 md:px-6 pt-2 md:pt-6">
              <CardTitle className="text-lg md:text-2xl font-bold text-center">
                {userContent?.reduce((sum, c) => sum + (c.saves_count || 0), 0) || 0}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-center">Guardados</CardDescription>
            </CardHeader>
          </Card>
          <Card className="hidden md:block">
            <CardHeader className="pb-2 md:pb-3 px-2 md:px-6 pt-2 md:pt-6">
              <CardTitle className="text-lg md:text-2xl font-bold text-center">
                {userContent?.reduce((sum, c) => sum + (c.shares_count || 0), 0) || 0}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-center">Compartidos</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Content tabs */}
        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Videos</span> ({videoContent.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Docs</span> ({documentContent.length})
            </TabsTrigger>
            <TabsTrigger value="readings" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Lecturas</span> ({readingContent.length})
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Quizzes</span> ({quizContent.length})
            </TabsTrigger>
            <TabsTrigger value="paths" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              <span className="hidden sm:inline">Rutas</span> ({learningPaths?.length || 0})
            </TabsTrigger>
            {isOwnProfile && (
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">Actividad</span>
              </TabsTrigger>
            )}
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

          <TabsContent value="readings" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {readingContent.length > 0 ? (
                readingContent.map((item) => <ContentItem key={item.id} item={item} />)
              ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No tienes lecturas aún</p>
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

          <TabsContent value="paths" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pathsLoading ? (
                [1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))
              ) : learningPaths && learningPaths.length > 0 ? (
                learningPaths.map((path) => <PathItem key={path.id} path={path} />)
              ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Map className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No tienes rutas de aprendizaje aún</p>
                  {isOwnProfile && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate("/learning-paths/create")}
                    >
                      Crear ruta de aprendizaje
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {isOwnProfile && (
            <TabsContent value="activity" className="mt-6">
              <Tabs defaultValue="liked" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="liked" className="flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Me gusta ({likedContent.length})
                  </TabsTrigger>
                  <TabsTrigger value="saved" className="flex items-center gap-2">
                    <Bookmark className="w-4 h-4" />
                    Guardados ({savedContent.length})
                  </TabsTrigger>
                  <TabsTrigger value="shared" className="flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Compartidos ({sharedContent.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="liked" className="mt-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {activityLoading ? (
                      [1, 2, 3].map((i) => <Skeleton key={i} className="h-64 w-full" />)
                    ) : likedContent.length > 0 ? (
                      likedContent.map((item) => <ContentItem key={item.id} item={item} hideActions />)
                    ) : (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No has dado me gusta a ningún contenido aún</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="saved" className="mt-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {activityLoading ? (
                      [1, 2, 3].map((i) => <Skeleton key={i} className="h-64 w-full" />)
                    ) : savedContent.length > 0 ? (
                      savedContent.map((item) => <ContentItem key={item.id} item={item} hideActions />)
                    ) : (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No has guardado ningún contenido aún</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="shared" className="mt-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {activityLoading ? (
                      [1, 2, 3].map((i) => <Skeleton key={i} className="h-64 w-full" />)
                    ) : sharedContent.length > 0 ? (
                      sharedContent.map((item) => <ContentItem key={item.id} item={item} hideActions />)
                    ) : (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        <Share2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No has compartido ningún contenido aún</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>
          )}
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

      {/* Delete path confirmation dialog */}
      <AlertDialog open={deletePathDialogOpen} onOpenChange={setDeletePathDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La ruta de aprendizaje será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePath} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Onboarding modal */}
      <OnboardingModal
        open={shouldShowOnboarding}
        onOpenChange={closeOnboarding}
        initialStep={initialStep}
      />

      {/* PDF Modal */}
      {selectedPdf && (
        <PDFModal
          open={pdfModalOpen}
          onOpenChange={setPdfModalOpen}
          fileUrl={selectedPdf.url}
          title={selectedPdf.title}
        />
      )}
    </div>
    </>
  );
};

export default Profile;
