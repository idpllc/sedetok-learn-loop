import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ContentCard } from "@/components/ContentCard";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useUserContent } from "@/hooks/useUserContent";
import { useUserLikes, useUserSaves } from "@/hooks/useContent";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayerRef } from "@/components/VideoPlayer";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const CreatorContent = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const contentIdFromUrl = searchParams.get("content");
  const { user } = useAuth();
  const { userContent, isLoading } = useUserContent(userId);
  const { likes } = useUserLikes();
  const { saves } = useUserSaves();
  const videoRefs = useRef<{ [key: string]: VideoPlayerRef | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);

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
  }, [pauseAllVideos, userContent]);

  // Scroll to specific content when contentId is in URL
  useEffect(() => {
    if (contentIdFromUrl && userContent && containerRef.current) {
      const contentIndex = userContent.findIndex((item) => item.id === contentIdFromUrl);
      if (contentIndex !== -1) {
        setTimeout(() => {
          const container = containerRef.current;
          const targetCard = container?.children[contentIndex];
          if (targetCard) {
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      }
    }
  }, [contentIdFromUrl, userContent]);

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

  if (!userContent || userContent.length === 0) {
    return (
      <div className="relative h-screen flex items-center justify-center">
        <Sidebar />
        <div className="md:ml-64 text-center space-y-4">
          <div className="text-6xl mb-4">📚</div>
          <p className="text-muted-foreground">Este creador no tiene contenido disponible</p>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Sidebar />
      
      <div className="md:ml-64">
        {/* Back button overlay */}
        <div className="fixed top-4 left-4 md:left-72 z-50">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => navigate(-1)}
            className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* Feed container with snap scroll */}
        <div ref={containerRef} className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth">
          {userContent.map((item: any, index: number) => {
            const videoRef = (ref: VideoPlayerRef | null) => {
              if (ref) {
                videoRefs.current[item.id] = ref;
              }
            };
            
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
                creator={item.profiles?.username || item.creator}
                creatorId={item.creator_id || userId}
                institution={item.profiles?.institution || item.institution}
                creatorAvatar={item.profiles?.avatar_url}
                tags={Array.isArray(item.tags) ? item.tags : []}
                category={item.category}
                subject={item.subject}
                thumbnail={item.thumbnail_url || item.thumbnail}
                videoUrl={item.video_url}
                documentUrl={item.document_url}
                richText={item.rich_text}
                contentType={item.content_type}
                likes={item.likes_count || item.likes}
                comments={item.comments_count || item.comments}
                shares={item.shares_count || 0}
                grade={item.grade_level || item.grade}
                isLiked={likes.has(item.id)}
                isSaved={saves.has(item.id)}
                questionsCount={item.questions_count}
                difficulty={item.difficulty}
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
                  if (container && index < userContent.length - 1) {
                    container.children[index + 1]?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                hasPrevious={index > 0}
                hasNext={index < userContent.length - 1}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CreatorContent;
