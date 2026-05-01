import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingModal } from "@/components/OnboardingModal";
import { OnboardingTeaser } from "@/components/OnboardingTeaser";
import { UsersSearchModal } from "@/components/UsersSearchModal";

import { useOnboardingTrigger } from "@/hooks/useOnboardingTrigger";
import { useInfiniteContent, useUserLikes, useUserSaves } from "@/hooks/useContent";
import { useSearchUsers } from "@/hooks/useSearchUsers";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search as SearchIcon, Play, BookOpen, FileText, ClipboardCheck, Map, Heart, MessageCircle, Bookmark, Eye, ChevronLeft, ChevronRight, Users, SlidersHorizontal } from "lucide-react";
import mindMapIcon from "@/assets/mind-map-icon.png";
import { useIsMobile } from "@/hooks/use-mobile";
import { subjects } from "@/lib/subjects";
import { getDisplayName } from "@/lib/displayName"; // display name helper
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getQuizScientistIcon } from "@/lib/quizScientists";

type ContentType = Database["public"]["Enums"]["content_type"];
type GradeLevel = Database["public"]["Enums"]["grade_level"];
type SearchContentType = ContentType | "learning_path" | "all";
const Index = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const subjectsScrollRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<SearchContentType>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | "all">('all');
  const [showExtraFilters, setShowExtraFilters] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  
  // Onboarding hook
  const { shouldShowOnboarding, initialStep, openOnboarding, closeOnboarding } = useOnboardingTrigger();
  
  // Content hooks - always call in same order
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: contentLoading } = useInfiniteContent(
    selectedType === "all" ? undefined : selectedType,
    searchQuery,
    selectedSubject !== "all" ? selectedSubject : undefined,
    selectedGrade !== "all" ? selectedGrade : undefined
  );
  const { data: searchedUsers, isLoading: usersLoading } = useSearchUsers(searchQuery);
  
  // User interaction hooks
  const { likes } = useUserLikes();
  const { saves } = useUserSaves();
  
  const isLoading = contentLoading;

  // All content already comes unified and paginated (max 20 per page) from the hook
  const filteredContent = (data?.pages ?? []).flatMap((page) => page.items || []);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const contentTypes = [
    { id: "video" as ContentType, label: "Videos", icon: "🎥" },
    { id: "learning_path" as const, label: "Rutas", icon: "🗺️" },
    { id: "game" as ContentType, label: "Juegos", icon: "🎮" },
    { id: "quiz" as ContentType, label: "Quizzes", icon: "📝" },
    { id: "lectura" as ContentType, label: "Lecturas", icon: "📖" },
    { id: "document" as ContentType, label: "Documentos", icon: "📄" },
  ];

  const gradeLevels = [
    { value: "all", label: "Todos" },
    { value: "preescolar", label: "Preescolar" },
    { value: "primaria", label: "Primaria" },
    { value: "secundaria", label: "Secundaria" },
    { value: "preparatoria", label: "Preparatoria" },
    { value: "universidad", label: "Universidad" },
    { value: "libre", label: "Libre" },
  ];

  // Filtering is now done server-side in useInfiniteContent

  const getContentIcon = (type: ContentType | "learning_path") => {
    switch (type) {
      case "video":
        return <Play className="w-5 h-5" />;
      case "lectura":
        return <BookOpen className="w-5 h-5" />;
      case "document":
        return <FileText className="w-5 h-5" />;
      case "quiz":
        return <ClipboardCheck className="w-5 h-5" />;
      case "game":
        return <span className="text-base">🎮</span>;
      case "mapa_mental":
        return <Brain className="w-5 h-5" />;
      case "learning_path":
        return <Map className="w-5 h-5" />;
    }
  };

  const getContentLabel = (type: ContentType | "learning_path") => {
    switch (type) {
      case "video": return "Video";
      case "lectura": return "Lectura";
      case "document": return "Documento";
      case "quiz": return "Quiz";
      case "game": return "Juego";
      case "mapa_mental": return "Mapa Mental";
      case "learning_path": return "Ruta";
      default: return type;
    }
  };

  const likeMutation = useMutation({
    mutationFn: async ({ contentId, isLiked, isQuiz, isGame }: { contentId: string; isLiked: boolean; isQuiz?: boolean; isGame?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const idField = isGame ? "game_id" : isQuiz ? "quiz_id" : "content_id";
      
      if (isLiked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq(idField, contentId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("likes")
          .insert([{ [idField]: contentId, user_id: user.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["infinite-content"] });
      queryClient.invalidateQueries({ queryKey: ["likes"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ contentId, isSaved, isQuiz, isGame }: { contentId: string; isSaved: boolean; isQuiz?: boolean; isGame?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const idField = isGame ? "game_id" : isQuiz ? "quiz_id" : "content_id";
      
      if (isSaved) {
        const { error } = await supabase
          .from("saves")
          .delete()
          .eq(idField, contentId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saves")
          .insert([{ [idField]: contentId, user_id: user.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saves"] });
      queryClient.invalidateQueries({ queryKey: ["infinite-content"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLike = (contentId: string, isLiked: boolean, isQuiz?: boolean, isGame?: boolean) => {
    likeMutation.mutate({ contentId, isLiked, isQuiz, isGame });
  };

  const handleSave = (contentId: string, isSaved: boolean, isQuiz?: boolean, isGame?: boolean) => {
    saveMutation.mutate({ contentId, isSaved, isQuiz, isGame });
  };

  const scrollSubjects = (direction: 'left' | 'right') => {
    if (subjectsScrollRef.current) {
      const scrollAmount = 300;
      subjectsScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-background pb-20 md:ml-64 pt-14 md:pt-0">
        <header className="sticky top-0 z-[5] bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-3 md:px-4 py-2 space-y-2">
            {/* Search Bar - hidden on mobile, visible on desktop */}
            <div className="relative hidden md:block">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar contenido..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Content Types row + Filter toggle button */}
            <div className="flex items-center gap-2">
              <Button
                variant={showExtraFilters ? "default" : "outline"}
                size="icon"
                className="flex-shrink-0 h-8 w-8 rounded-full"
                onClick={() => setShowExtraFilters(!showExtraFilters)}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
              <div className="flex gap-2 overflow-x-auto pb-0.5 flex-1">
                {contentTypes.map((type) => (
                  <Badge
                    key={type.id}
                    variant={selectedType === type.id ? "default" : "outline"}
                    className="cursor-pointer whitespace-nowrap py-1.5"
                    onClick={() => setSelectedType(selectedType === type.id ? 'all' : type.id)}
                  >
                    <span className="mr-1">{type.icon}</span>
                    {type.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Subjects Carousel - toggled by filter button */}
            {showExtraFilters && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background/90"
                  onClick={() => scrollSubjects('left')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <ScrollArea className="w-full whitespace-nowrap" ref={subjectsScrollRef}>
                  <div className="flex gap-2 px-8">
                    <Button
                      variant={selectedSubject === "all" ? "default" : "outline"}
                      className="rounded-full whitespace-nowrap"
                      size="sm"
                      onClick={() => setSelectedSubject("all")}
                    >
                      Todos
                    </Button>
                    {subjects.map((subject) => (
                      <Button
                        key={subject.value}
                        variant={selectedSubject === subject.value ? "default" : "outline"}
                        className="rounded-full whitespace-nowrap"
                        size="sm"
                        onClick={() => setSelectedSubject(subject.value)}
                      >
                        {subject.label}
                      </Button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" className="invisible" />
                </ScrollArea>

                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background/90"
                  onClick={() => scrollSubjects('right')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Grade Levels - toggled by filter button */}
            {showExtraFilters && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {gradeLevels.map((level) => (
                  <Button
                    key={level.value}
                    variant={selectedGrade === level.value ? "default" : "outline"}
                    size="sm"
                    className="whitespace-nowrap rounded-full"
                    onClick={() => setSelectedGrade(level.value as GradeLevel | "all")}
                  >
                    {level.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-3 md:px-4 py-3 space-y-6">
          {/* Users Section - Only show when searching */}
          {searchQuery && searchedUsers && searchedUsers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4 gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Usuarios</h2>
                  <Badge variant="secondary">{searchedUsers.length}</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUsersModal(true)}
                >
                  <SearchIcon className="w-4 h-4 mr-2" />
                  Buscar usuarios
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                {searchedUsers.slice(0, 4).map((profile) => (
                  <Card 
                    key={profile.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/profile/${profile.username}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={profile.avatar_url || ""} alt={profile.full_name || profile.username} />
                          <AvatarFallback>
                            {(profile.full_name || profile.username).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">
                            {profile.full_name || profile.username}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            @{profile.username}
                          </p>
                          {profile.bio && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {profile.bio}
                            </p>
                          )}
                          <div className="flex items-center gap-1 mt-2">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {profile.followers_count || 0} seguidores
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {searchedUsers.length > 4 && (
                <div className="flex justify-center mb-8 -mt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setShowUsersModal(true)}
                  >
                    Ver más usuarios ({searchedUsers.length - 4})
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Content Section Header */}
          {searchQuery && searchedUsers && searchedUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Contenido</h2>
            </div>
          )}

          {/* Main Content Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-[200px] w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredContent && filteredContent.length > 0 ? (
            <>
              {/* <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {filteredContent.length} {filteredContent.length === 1 ? "resultado" : "resultados"}
                </p>
              </div> */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {filteredContent.map((item) => {
                  const isLearningPath = item.itemType === "learning_path";
                  const isQuiz = !isLearningPath && item.content_type === 'quiz';
                  const isLiked = !isLearningPath && likes.has(item.id);
                  const isSaved = !isLearningPath && saves.has(item.id);
                  const profile = item.profiles as any;
                  const scientist = isQuiz ? getQuizScientistIcon(item.category) : null;
                  
                  return (
                    <Card 
                      key={item.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => {
                        if (isLearningPath) {
                          navigate(`/learning-paths/${item.id}`);
                        } else {
                          const itemIndex = filteredContent.findIndex(c => c.id === item.id);
                          const params = new URLSearchParams();
                          
                          if (isQuiz) {
                            params.set('quiz', item.id);
                          } else if (item.content_type === 'game') {
                            params.set('game', item.id);
                          } else {
                            params.set('content', item.id);
                          }
                          
                          // Pass filter parameters
                          if (selectedType !== 'all') params.set('type', selectedType);
                          if (selectedSubject !== 'all') params.set('subject', selectedSubject);
                          if (selectedGrade !== 'all') params.set('grade', selectedGrade);
                          if (searchQuery) params.set('q', searchQuery);
                          params.set('index', itemIndex.toString());
                          
                          navigate(`/sedetok?${params.toString()}`);
                        }
                      }}
                    >
                      <CardContent className="p-0">
                        <div className={`relative aspect-[16/10] ${
                          isQuiz 
                            ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' 
                            : item.content_type === 'lectura' && !item.cover_url && !item.thumbnail_url
                            ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40'
                            : item.content_type === 'game' && !item.cover_url && !item.thumbnail_url
                            ? 'bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/20'
                            : item.content_type === 'mapa_mental' && !item.cover_url && !item.thumbnail_url
                            ? 'bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-cyan-950/40'
                            : 'bg-gradient-to-br from-primary/20 to-secondary/20'
                        }`}>
                          {(item.cover_url || item.thumbnail_url) ? (
                            <img 
                              src={item.cover_url || item.thumbnail_url} 
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : isQuiz && scientist ? (
                            <>
                              {/* Question mark pattern background */}
                              <div className="absolute inset-0 opacity-10 flex flex-wrap items-center justify-center overflow-hidden select-none pointer-events-none text-white text-4xl font-bold leading-tight tracking-widest">
                                {'? '.repeat(60)}
                              </div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <img src={scientist.icon} alt={scientist.name} className="w-24 h-24 object-contain rounded-full border-2 border-white/20 shadow-xl" />
                              </div>
                            </>
                          ) : item.content_type === 'lectura' && item.rich_text ? (
                            <div className="absolute inset-0 p-4 overflow-hidden">
                              <p className="text-xs leading-relaxed text-muted-foreground line-clamp-[8] whitespace-pre-wrap font-serif">
                                {item.rich_text}
                              </p>
                              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-amber-50 dark:from-amber-950/40 to-transparent" />
                            </div>
                          ) : item.content_type === 'game' && !item.cover_url && !item.thumbnail_url ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                              <span className="text-5xl">🎮</span>
                              <span className="text-xs font-medium text-muted-foreground capitalize">{item.game_type?.replace('_', ' ') || 'Juego'}</span>
                            </div>
                          ) : item.content_type === 'mapa_mental' && !item.cover_url && !item.thumbnail_url ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center">
                              <Brain className="w-12 h-12 text-emerald-700 dark:text-emerald-300" strokeWidth={1.5} />
                              <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-100 line-clamp-2">
                                {item.mind_map_data?.root?.title || "Mapa Mental"}
                              </span>
                              <span className="text-[10px] uppercase tracking-wider text-emerald-700/80 dark:text-emerald-300/80">
                                Mapa Mental
                              </span>
                            </div>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              {getContentIcon(isLearningPath ? "learning_path" : item.content_type)}
                            </div>
                          )}
                          {/* Gradient overlay at bottom of cover */}
                          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
                          {/* Creator username on cover */}
                          <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
                            {profile?.avatar_url && (
                              <Avatar className="w-5 h-5 border border-white/50">
                                <AvatarImage src={profile.avatar_url} />
                                <AvatarFallback className="text-[8px]">{getDisplayName(profile)[0].toUpperCase()}</AvatarFallback>
                              </Avatar>
                            )}
                            <span className="text-xs font-semibold text-white drop-shadow-md">
                              {getDisplayName(profile) !== "Usuario" ? getDisplayName(profile) : item.creator}
                            </span>
                          </div>
                          <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="backdrop-blur-sm shadow-sm text-[10px] px-1.5 py-0.5">
                              {getContentIcon(isLearningPath ? "learning_path" : item.content_type)}
                              <span className="ml-1">
                                {getContentLabel(isLearningPath ? "learning_path" : item.content_type)}
                              </span>
                            </Badge>
                          </div>
                        </div>
                        <div className="px-3 py-2 space-y-1">
                          <h3 className="font-semibold text-sm line-clamp-1">{item.title}</h3>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                          )}
                          <div className="flex items-center justify-end">
                            {!isLearningPath && (
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLike(item.id, isLiked, isQuiz, item.content_type === 'game');
                                  }}
                                  className="flex items-center gap-1 hover:text-red-500 transition-colors"
                                >
                                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                                  {item.likes_count || 0}
                                </button>
                                <span className="flex items-center gap-1">
                                  <MessageCircle className="w-4 h-4" />
                                  {item.comments_count || 0}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSave(item.id, isSaved, isQuiz, item.content_type === 'game');
                                  }}
                                  className="hover:text-primary transition-colors"
                                >
                                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-primary' : ''}`} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {/* Observer target for infinite scroll */}
              <div ref={observerTarget} className="h-10" />
              
              {isFetchingNextPage && (
                <div className="flex justify-center py-8">
                  <Skeleton className="h-[200px] w-full max-w-md rounded-xl" />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No se encontraron resultados</p>
            </div>
          )}
        </main>

        {/* Onboarding modal */}
        {user && (
          <>
            <OnboardingModal
              open={shouldShowOnboarding}
              onOpenChange={closeOnboarding}
              initialStep={initialStep}
            />
            <OnboardingTeaser onOpenOnboarding={openOnboarding} />
          </>
        )}
        <UsersSearchModal
          open={showUsersModal}
          onOpenChange={setShowUsersModal}
          initialQuery={searchQuery}
        />
      </div>
    </>
  );
};

export default Index;
