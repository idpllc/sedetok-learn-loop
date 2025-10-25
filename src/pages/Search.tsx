import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, BookOpen, Map, ChevronLeft, ChevronRight } from "lucide-react";
import { getQuizScientistIcon } from "@/lib/quizScientists";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { useInfiniteContent, useUserLikes, useUserSaves } from "@/hooks/useContent";
import { useLearningPaths } from "@/hooks/useLearningPaths";
import { Skeleton } from "@/components/ui/skeleton";
import { Database } from "@/integrations/supabase/types";
import { Heart, MessageCircle, Bookmark, Eye, Play, FileText, ClipboardCheck, Share2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subjects } from "@/lib/subjects";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

type ContentType = Database["public"]["Enums"]["content_type"];
type CategoryType = Database["public"]["Enums"]["category_type"];
type GradeLevel = Database["public"]["Enums"]["grade_level"];
type SearchContentType = ContentType | "learning_path" | "all";

const Search = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<SearchContentType>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | "all">("all");
  const subjectsScrollRef = useRef<HTMLDivElement>(null);
  
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: contentLoading } = useInfiniteContent(
    selectedType === "all" ? undefined : selectedType === "learning_path" ? undefined : selectedType,
    searchQuery,
    selectedSubject !== "all" ? selectedSubject : undefined,
    selectedGrade !== "all" ? selectedGrade : undefined
  );
  const { paths, isLoading: pathsLoading } = useLearningPaths();
  const { likes } = useUserLikes();
  const { saves } = useUserSaves();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const observerTarget = useRef<HTMLDivElement>(null);

  const isLoading = contentLoading || pathsLoading;

  // Inicializar el query desde la URL
  useEffect(() => {
    const queryFromUrl = searchParams.get('q');
    if (queryFromUrl) {
      setSearchQuery(queryFromUrl);
    }
  }, [searchParams]);

  // Combine content from all pages
  const allContent = data?.pages.flatMap(page => page.items) || [];
  
  // Combine content and paths
  const combinedContent = [
    ...allContent.map(item => ({ ...item, itemType: 'content' })),
    ...(paths?.filter(p => p.is_public).map(p => ({ ...p, itemType: 'learning_path' })) || [])
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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

  // Filter for learning paths (client-side since they come from a different hook)
  const filteredContent = combinedContent?.filter((item) => {
    // For learning paths, apply client-side filters
    if (item.itemType === "learning_path") {
      const matchesSearch = !searchQuery || searchQuery.trim() === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.subject?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = selectedType === "all" || selectedType === "learning_path";
      const matchesSubject = selectedSubject === "all" || item.subject?.toLowerCase() === selectedSubject.toLowerCase();
      const matchesGrade = selectedGrade === "all" || item.grade_level === selectedGrade;
      
      return matchesSearch && matchesType && matchesSubject && matchesGrade;
    }
    
    // For content and quizzes, only apply type filter (other filters are already applied server-side)
    const matchesType = selectedType === "all" || selectedType === item.content_type || (selectedType === "quiz" && item.content_type === "quiz");
    
    return matchesType;
  });

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
    mutationFn: async ({ contentId, isLiked, isQuiz }: { contentId: string; isLiked: boolean; isQuiz?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const idField = isQuiz ? "quiz_id" : "content_id";
      
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
    mutationFn: async ({ contentId, isSaved, isQuiz }: { contentId: string; isSaved: boolean; isQuiz?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const idField = isQuiz ? "quiz_id" : "content_id";
      
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

  const handleLike = (contentId: string, isLiked: boolean, isQuiz?: boolean) => {
    likeMutation.mutate({ contentId, isLiked, isQuiz });
  };

  const handleSave = (contentId: string, isSaved: boolean, isQuiz?: boolean) => {
    saveMutation.mutate({ contentId, isSaved, isQuiz });
  };

  const gradeLevels = [
    { value: "all", label: "Todos" },
    { value: "preescolar", label: "Preescolar" },
    { value: "primaria", label: "Primaria" },
    { value: "secundaria", label: "Secundaria" },
    { value: "preparatoria", label: "Preparatoria" },
    { value: "universidad", label: "Universidad" },
    { value: "libre", label: "Libre" },
  ];

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

      <main className="max-w-7xl mx-auto px-4 py-6">
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
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {filteredContent.length} {filteredContent.length === 1 ? "resultado" : "resultados"}
              </p>
            </div>
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
                      } else if (isQuiz) {
                        navigate(`/?quiz=${item.id}`);
                      } else if (item.content_type === 'game') {
                        navigate(`/?game=${item.id}`);
                      } else {
                        navigate(`/?content=${item.id}`);
                      }
                    }}
                  >
                    <CardContent className="p-0">
                      {/* Thumbnail/Preview */}
                      <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-secondary/20">
                        {(item.cover_url || item.thumbnail_url) ? (
                          <img 
                            src={item.cover_url || item.thumbnail_url} 
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : isQuiz && scientist ? (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500/30 via-pink-500/30 to-blue-500/30 flex items-center justify-center">
                            <div className="text-center">
                              <img 
                                src={scientist.icon} 
                                alt={scientist.name}
                                className="w-24 h-24 mx-auto rounded-full shadow-xl border-4 border-white/30 object-cover mb-3"
                              />
                              <p className="text-sm text-white/80">{scientist.name}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-5xl mb-2">
                                {isLearningPath ? '🗺️' : 
                                 item.content_type === 'video' ? '🎥' : 
                                 item.content_type === 'document' ? '📄' : 
                                 item.content_type === 'lectura' ? '📖' : 
                                 item.content_type === 'game' ? '🎮' : '📝'}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Content type badge */}
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-primary text-primary-foreground gap-1">
                            {getContentIcon(isLearningPath ? "learning_path" : item.content_type)}
                            <span className="capitalize">
                              {isLearningPath ? 'Ruta' : 
                               item.content_type === 'video' ? 'Video' : 
                               item.content_type === 'lectura' ? 'Lectura' :
                               item.content_type === 'document' ? 'Documento' : 
                               item.content_type === 'game' ? 'Juego' : 'Quiz'}
                            </span>
                          </Badge>
                        </div>

                        {/* Category badge */}
                        <div className="absolute top-3 right-3">
                          <Badge variant="secondary" className="capitalize">
                            {item.subject || item.category}
                          </Badge>
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="font-bold text-lg mb-1 line-clamp-2">{item.title}</h3>
                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                          )}
                        </div>

                        {/* Creator info */}
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-xs font-bold">{profile?.username?.[0]?.toUpperCase() || 'U'}</span>
                          </div>
                          <span className="text-muted-foreground">
                            {profile?.username || 'Usuario'}
                            {profile?.institution && <span className="text-xs"> · {profile.institution}</span>}
                          </span>
                          {profile?.is_verified && <span className="text-xs">✓</span>}
                        </div>

                        {/* Tags */}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                            {item.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{item.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          {isLearningPath ? (
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <span className="font-semibold">{item.total_xp || 0} XP</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span>{item.estimated_duration || 0} min</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                                  <span>{item.likes_count}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageCircle className="w-4 h-4" />
                                  <span>{item.comments_count}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Eye className="w-4 h-4" />
                                  <span>{item.views_count}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Share2 className="w-4 h-4" />
                                  <span>{item.shares_count || 0}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLike(item.id, isLiked, isQuiz);
                                  }}
                                >
                                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSave(item.id, isSaved, isQuiz);
                                  }}
                                >
                                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Infinite scroll trigger */}
            <div ref={observerTarget} className="h-20 flex items-center justify-center mt-6">
              {isFetchingNextPage && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-[300px] w-full rounded-xl" />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No se encontraron resultados</h3>
            <p className="text-muted-foreground max-w-sm">
              {searchQuery 
                ? "Intenta con otros términos de búsqueda o cambia los filtros"
                : "No hay contenido disponible en este momento"}
            </p>
            {(searchQuery || selectedType !== "all") && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedType("all");
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
    </>
  );
};

export default Search;
