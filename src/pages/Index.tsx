import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingModal } from "@/components/OnboardingModal";
import { OnboardingTeaser } from "@/components/OnboardingTeaser";

import { useOnboardingTrigger } from "@/hooks/useOnboardingTrigger";
import { useInfiniteContent, useUserLikes, useUserSaves } from "@/hooks/useContent";
import { useSearchUsers } from "@/hooks/useSearchUsers";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search as SearchIcon, Play, BookOpen, FileText, ClipboardCheck, Map, Heart, MessageCircle, Bookmark, Eye, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { subjects } from "@/lib/subjects";
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
    { id: "all" as const, label: "Todo", icon: "🎯" },
    { id: "video" as ContentType, label: "Videos", icon: "🎥" },
    { id: "lectura" as ContentType, label: "Lecturas", icon: "📖" },
    { id: "document" as ContentType, label: "Documentos", icon: "📄" },
    { id: "quiz" as ContentType, label: "Quizzes", icon: "📝" },
    { id: "game" as ContentType, label: "Juegos", icon: "🎮" },
    { id: "learning_path" as const, label: "Rutas", icon: "🗺️" },
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
      case "learning_path":
        return <Map className="w-5 h-5" />;
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
      <div className="min-h-screen bg-background pb-20 md:ml-64 pt-20 md:pt-0">
        <header className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar contenido..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Subjects Carousel */}
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
                    onClick={() => setSelectedSubject("all")}
                  >
                    Todos
                  </Button>
                  {subjects.map((subject) => (
                    <Button
                      key={subject.value}
                      variant={selectedSubject === subject.value ? "default" : "outline"}
                      className="rounded-full whitespace-nowrap"
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

            {/* Grade Levels */}
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

            {/* Content Types */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {contentTypes.map((type) => (
                <Badge
                  key={type.id}
                  variant={selectedType === type.id ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap py-1.5"
                  onClick={() => setSelectedType(type.id)}
                >
                  <span className="mr-1">{type.icon}</span>
                  {type.label}
                </Badge>
              ))}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
          {/* Users Section - Only show when searching */}
          {searchQuery && searchedUsers && searchedUsers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Usuarios</h2>
                <Badge variant="secondary">{searchedUsers.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                {searchedUsers.map((profile) => (
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-secondary/20">
                          {(item.cover_url || item.thumbnail_url) ? (
                            <img 
                              src={item.cover_url || item.thumbnail_url} 
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : scientist ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <img src={scientist.icon} alt={scientist.name} className="w-32 h-32 object-contain" />
                            </div>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              {getContentIcon(isLearningPath ? "learning_path" : item.content_type)}
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="backdrop-blur-sm shadow-sm">
                              {getContentIcon(isLearningPath ? "learning_path" : item.content_type)}
                              <span className="ml-1 capitalize">
                                {isLearningPath ? "Ruta" : item.content_type}
                              </span>
                            </Badge>
                          </div>
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold line-clamp-2">{item.title}</h3>
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                          )}
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {profile?.username || item.creator}
                            </div>
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
      </div>
    </>
  );
};

export default Index;
