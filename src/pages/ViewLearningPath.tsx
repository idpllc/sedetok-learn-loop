import { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ContentCard } from "@/components/ContentCard";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { usePathContent } from "@/hooks/useLearningPaths";
import { useUserLikes, useUserSaves } from "@/hooks/useContent";
import { usePathProgress } from "@/hooks/usePathProgress";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayerRef } from "@/components/VideoPlayer";
import { ArrowLeft, Map, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PathMapView } from "@/components/learning-paths/PathMapView";

const ViewLearningPath = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { contents: pathContent, isLoading } = usePathContent(id);
  const { likes } = useUserLikes();
  const { saves } = useUserSaves();
  const { markComplete, getCompletedIds, isCompleted } = usePathProgress(id);
  const videoRefs = useRef<{ [key: string]: VideoPlayerRef | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"map" | "cards">("map");
  const completedIds = getCompletedIds();

  // Fetch learning path info
  const { data: pathInfo } = useQuery({
    queryKey: ["learning-path", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_paths")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
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
    if (!container) return;

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
  }, [pauseAllVideos, pathContent]);

  if (isLoading) {
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

  if (!pathContent || pathContent.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-muted-foreground">Esta ruta no tiene cápsulas todavía</p>
        <Button onClick={() => navigate("/learning-paths")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Rutas
        </Button>
      </div>
    );
  }

  const handleContentClick = (contentId: string, index: number) => {
    setViewMode("cards");
    pauseAllVideos();
    setTimeout(() => {
      const container = document.querySelector('.snap-y');
      if (container) {
        container.children[index]?.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Transform pathContent to match ContentCard expected format
  const contentData = pathContent
    .sort((a, b) => a.order_index - b.order_index)
    .map((item) => {
      const isQuiz = !!item.quiz_id;
      
      if (isQuiz && item.quiz) {
        const quiz = item.quiz;
        
        return {
          id: item.quiz_id!,
          title: quiz.title || "",
          description: quiz.description || "",
          creator_id: quiz.creator_id,
          creator: "",
          institution: "",
          creatorAvatar: undefined,
          tags: [],
          category: quiz.category,
          thumbnail_url: quiz.thumbnail_url,
          video_url: undefined,
          documento_url: undefined,
          rich_text: undefined,
          content_type: 'quiz' as const,
          likes_count: 0,
          comments_count: 0,
          shares_count: 0,
          grade_level: quiz.grade_level,
          profiles: undefined,
          questions_count: 10, // Default placeholder, will show in UI
          difficulty: quiz.difficulty,
        };
      } else if (item.content) {
        const content = item.content;
        return {
          id: item.content_id!,
          title: content.title || "",
          description: content.description || "",
          creator_id: content.creator_id,
          creator: "",
          institution: "",
          creatorAvatar: undefined,
          tags: content.tags || [],
          category: content.category,
          thumbnail_url: content.thumbnail_url,
          video_url: content.video_url,
          documento_url: content.document_url,
          rich_text: content.rich_text,
          content_type: content.content_type,
          likes_count: content.likes_count || 0,
          comments_count: content.comments_count || 0,
          shares_count: content.shares_count || 0,
          grade_level: content.grade_level,
          profiles: undefined,
          questions_count: undefined,
          difficulty: undefined,
        };
      }
      
      return null;
    })
    .filter(Boolean) as any[];

  // Get path info
  const pathTitle = pathInfo?.title || "Ruta de Aprendizaje";
  const pathDescription = pathInfo?.description;

  // Map view
  if (viewMode === "map") {
    return (
      <div className="relative">
        {/* Back button */}
        <div className="absolute top-4 left-4 z-50">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => navigate("/learning-paths")}
            className="rounded-full bg-background/80 backdrop-blur-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* View toggle button */}
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setViewMode("cards")}
            className="rounded-full bg-background/80 backdrop-blur-sm"
          >
            <List className="w-5 h-5" />
          </Button>
        </div>

        <PathMapView
          pathTitle={pathTitle}
          pathDescription={pathDescription}
          contents={contentData}
          completedIds={completedIds}
          onContentClick={handleContentClick}
        />
        
        <BottomNav />
      </div>
    );
  }

  // Cards view
  return (
    <div className="relative">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => navigate("/learning-paths")}
          className="rounded-full bg-background/80 backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* View toggle button */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setViewMode("map")}
          className="rounded-full bg-background/80 backdrop-blur-sm"
        >
          <Map className="w-5 h-5" />
        </Button>
      </div>

      {/* Feed container with snap scroll */}
      <div ref={containerRef} className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth">
        {contentData.map((item: any, index: number) => {
          const videoRef = (ref: VideoPlayerRef | null) => {
            if (ref) {
              videoRefs.current[item.id] = ref;
            }
          };

          const isQuiz = item.content_type === 'quiz';
          const itemContentId = isQuiz ? undefined : item.id;
          const itemQuizId = isQuiz ? item.id : undefined;
          
          return (
            <ContentCard
              key={item.id}
              data-content-id={item.id}
              ref={(el) => {
                if (el) el.dataset.contentId = item.id;
              }}
              id={item.id}
              videoRef={videoRef}
              title={item.title}
              description={item.description}
              creator={item.creator}
              creatorId={item.creator_id}
              institution={item.institution}
              creatorAvatar={item.creatorAvatar}
              tags={Array.isArray(item.tags) ? item.tags : []}
              category={item.category}
              thumbnail={item.thumbnail_url}
              videoUrl={item.video_url}
              documentUrl={item.documento_url}
              richText={item.rich_text}
              contentType={item.content_type}
              likes={item.likes_count}
              comments={item.comments_count}
              shares={item.shares_count}
              grade={item.grade_level}
              isLiked={likes.has(item.id)}
              isSaved={saves.has(item.id)}
              questionsCount={item.questions_count}
              difficulty={item.difficulty}
              onVideoWatched={() => {
                markComplete.mutate({ contentId: itemContentId });
              }}
              onReadComplete={() => {
                markComplete.mutate({ contentId: itemContentId });
              }}
              onDocumentDownload={() => {
                markComplete.mutate({ contentId: itemContentId });
              }}
              onQuizComplete={(passed) => {
                if (passed) {
                  markComplete.mutate({ quizId: itemQuizId });
                }
              }}
              onPrevious={() => {
                pauseAllVideos();
                const container = document.querySelector('.snap-y');
                if (container && index > 0) {
                  container.children[index - 1]?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              onNext={() => {
                pauseAllVideos();
                const container = document.querySelector('.snap-y');
                if (container && index < contentData.length - 1) {
                  container.children[index + 1]?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              hasPrevious={index > 0}
              hasNext={index < contentData.length - 1}
            />
          );
        })}
      </div>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
};

export default ViewLearningPath;
