import { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ContentCard } from "@/components/ContentCard";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useUserLikes, useUserSaves } from "@/hooks/useContent";
import { usePathProgress } from "@/hooks/usePathProgress";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayerRef } from "@/components/VideoPlayer";
import { ArrowLeft, Map, List, Share2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PathMapView } from "@/components/learning-paths/PathMapView";
import { PathInfoCard } from "@/components/PathInfoCard";
import { SharePathSheet } from "@/components/SharePathSheet";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const ViewCourse = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { likes } = useUserLikes();
  const { saves } = useUserSaves();
  const videoRefs = useRef<{ [key: string]: VideoPlayerRef | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"map" | "cards">("cards");
  const [openLevelId, setOpenLevelId] = useState<string | null>(null);

  // Fetch course info
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch course levels
  const { data: levels, isLoading: levelsLoading } = useQuery({
    queryKey: ["course-levels", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_levels")
        .select("*")
        .eq("course_id", id)
        .order("order_index");
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch routes for each level
  const { data: courseRoutes, isLoading: routesLoading } = useQuery({
    queryKey: ["course-routes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_routes")
        .select(`
          *,
          learning_paths(*)
        `)
        .eq("course_id", id)
        .order("order_index");
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Group routes by level
  const leveledRoutes = levels?.map(level => ({
    ...level,
    routes: courseRoutes?.filter(r => r.level_id === level.id) || []
  })) || [];

  // Get all learning paths content
  const allPathIds = courseRoutes?.map(r => r.path_id).filter(Boolean) || [];
  
  const { data: pathContents } = useQuery({
    queryKey: ["paths-content", allPathIds.join(",")],
    queryFn: async () => {
      if (allPathIds.length === 0) return [];
      
      const contentPromises = allPathIds.map(async pathId => {
        const { data, error } = await supabase
          .from("learning_path_content")
          .select(`
            *,
            content(*),
            quiz:quizzes(*)
          `)
          .eq("path_id", pathId)
          .order("order_index");
        
        if (error) throw error;
        return { pathId, content: data || [] };
      });
      
      return await Promise.all(contentPromises);
    },
    enabled: allPathIds.length > 0,
  });

  const pauseAllVideos = useCallback((exceptId?: string) => {
    Object.entries(videoRefs.current).forEach(([id, ref]) => {
      if (id !== exceptId && ref) {
        ref.pause();
      }
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || viewMode !== "cards") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const cardElement = entry.target as HTMLElement;
          const cardId = cardElement.dataset.contentId;
          
          if (entry.isIntersecting && cardId) {
            pauseAllVideos(cardId);
            setTimeout(() => {
              const ref = videoRefs.current[cardId];
              if (ref) ref.play();
            }, 100);
          } else if (!entry.isIntersecting && cardId) {
            const ref = videoRefs.current[cardId];
            if (ref) ref.pause();
          }
        });
      },
      { threshold: 0.5 }
    );

    const cards = container.querySelectorAll('[data-content-id]');
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [pauseAllVideos, viewMode, pathContents]);

  if (courseLoading || levelsLoading || routesLoading) {
    return (
      <div className="relative h-screen">
        <div className="h-screen overflow-y-scroll snap-y snap-mandatory">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-screen w-full snap-start snap-always flex items-center justify-center bg-muted/50">
              <Skeleton className="w-full max-w-md h-[85vh] rounded-3xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-muted-foreground">Este curso no existe</p>
        <Button onClick={() => navigate("/courses")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Cursos
        </Button>
      </div>
    );
  }

  // Map view for course structure
  if (viewMode === "map") {
    return (
      <div className="relative min-h-screen bg-background pb-20">
        {/* Back button */}
        <div className="absolute top-4 left-4 z-50">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => navigate("/courses")}
            className="rounded-full bg-black/60 backdrop-blur-md shadow-lg text-white hover:bg-black/70"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* Action buttons */}
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setViewMode("cards")}
            className="rounded-full bg-black/60 backdrop-blur-md shadow-lg text-white hover:bg-black/70"
          >
            <List className="w-5 h-5" />
          </Button>
        </div>

        {/* Course header */}
        <div className="container mx-auto px-4 py-20">
          {course.cover_url && (
            <div className="w-full aspect-video rounded-lg overflow-hidden mb-6">
              <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover" />
            </div>
          )}
          
          <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
          {course.description && (
            <p className="text-muted-foreground mb-6">{course.description}</p>
          )}

          {/* Levels and routes */}
          <div className="space-y-4">
            {leveledRoutes.map((level, levelIndex) => (
              <Collapsible
                key={level.id}
                open={openLevelId === level.id}
                onOpenChange={(open) => setOpenLevelId(open ? level.id : null)}
              >
                <CollapsibleTrigger asChild>
                  <div className="bg-card border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="default" className="font-medium">
                            Nivel {levelIndex + 1}
                          </Badge>
                          <h3 className="font-semibold text-lg">{level.name}</h3>
                        </div>
                        {level.description && (
                          <p className="text-sm text-muted-foreground">{level.description}</p>
                        )}
                      </div>
                      <ChevronDown className={`w-5 h-5 transition-transform ${openLevelId === level.id ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-2 space-y-2">
                  {level.routes.map((route: any, routeIndex) => {
                    const path = route.learning_paths;
                    if (!path) return null;
                    
                    return (
                      <div
                        key={route.id}
                        onClick={() => navigate(`/learning-paths/${path.id}`)}
                        className="bg-muted/30 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors ml-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold flex-shrink-0">
                            {routeIndex + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium mb-1">{path.title}</h4>
                            {path.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{path.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {path.subject && (
                                <Badge variant="secondary" className="text-xs">{path.subject}</Badge>
                              )}
                              {path.total_xp > 0 && (
                                <span className="text-xs text-muted-foreground">⚡ {path.total_xp} XP</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
        
        <BottomNav />
      </div>
    );
  }

  // Cards view - carousel of all content
  const allContent: any[] = [];
  
  // Build content array with level/route context
  leveledRoutes.forEach((level, levelIndex) => {
    level.routes.forEach((route: any, routeIndex) => {
      const pathContent = pathContents?.find(pc => pc.pathId === route.path_id)?.content || [];
      
      pathContent.forEach((item: any, contentIndex: number) => {
        allContent.push({
          ...item,
          levelName: level.name,
          levelIndex,
          routeIndex,
          contentIndex,
        });
      });
    });
  });

  return (
    <div className="relative">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => navigate("/courses")}
          className="rounded-full bg-black/60 backdrop-blur-md shadow-lg text-white hover:bg-black/70"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Action buttons */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setViewMode("map")}
          className="rounded-full bg-black/60 backdrop-blur-md shadow-lg text-white hover:bg-black/70"
        >
          <Map className="w-5 h-5" />
        </Button>
      </div>

      {/* Feed container with snap scroll */}
      <div ref={containerRef} className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth">
        {/* Course Info Card - First slide */}
        <PathInfoCard
          pathId={id!}
          title={course.title}
          description={course.description}
          category={course.category || ""}
          gradeLevel={course.grade_level || ""}
          estimatedDuration={course.estimated_duration}
          totalXp={course.total_xp}
          coverUrl={course.cover_url}
          contentCount={allContent.length}
          isPublic={course.is_public ?? true}
          creatorId={course.creator_id}
          onStart={() => {
            const container = document.querySelector('.snap-y');
            if (container && container.children.length > 1) {
              container.children[1]?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          onNext={() => {
            const container = document.querySelector('.snap-y');
            if (container && container.children.length > 1) {
              container.children[1]?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          hasNext={allContent.length > 0}
        />
        
        {/* Content cards */}
        {allContent.map((item: any, index: number) => {
          const isQuiz = !!item.quiz_id;
          const content = isQuiz ? item.quiz : item.content;
          
          if (!content) return null;

          const videoRef = (ref: VideoPlayerRef | null) => {
            if (ref) {
              videoRefs.current[content.id] = ref;
            }
          };

          return (
            <ContentCard
              key={`${item.levelIndex}-${item.routeIndex}-${index}`}
              data-content-id={content.id}
              ref={(el) => {
                if (el) el.dataset.contentId = content.id;
              }}
              id={content.id}
              videoRef={videoRef}
              title={content.title}
              description={content.description}
              creator={content.profiles?.username || ""}
              creatorId={content.creator_id}
              institution={content.profiles?.institution}
              creatorAvatar={content.profiles?.avatar_url}
              tags={Array.isArray(content.tags) ? content.tags : []}
              category={content.category}
              thumbnail={content.thumbnail_url}
              videoUrl={content.video_url}
              documentUrl={content.document_url}
              richText={content.rich_text}
              contentType={isQuiz ? 'quiz' : content.content_type}
              likes={content.likes_count || 0}
              comments={content.comments_count || 0}
              shares={content.shares_count || 0}
              grade={content.grade_level}
              isLiked={likes.has(content.id)}
              isSaved={saves.has(content.id)}
              difficulty={content.difficulty}
              onPrevious={() => {
                pauseAllVideos();
                const container = document.querySelector('.snap-y');
                if (container) {
                  container.children[index]?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              onNext={() => {
                pauseAllVideos();
                const container = document.querySelector('.snap-y');
                if (container && index < allContent.length - 1) {
                  container.children[index + 2]?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              hasPrevious={true}
              hasNext={index < allContent.length - 1}
            />
          );
        })}
      </div>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
};

export default ViewCourse;
