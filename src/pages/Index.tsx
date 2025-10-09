import { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ContentCard } from "@/components/ContentCard";
import { BottomNav } from "@/components/BottomNav";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingModal } from "@/components/OnboardingModal";
import { OnboardingTeaser } from "@/components/OnboardingTeaser";
import { useOnboardingTrigger } from "@/hooks/useOnboardingTrigger";
import { useContent, useUserLikes, useUserSaves } from "@/hooks/useContent";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayerRef } from "@/components/VideoPlayer";

const mockContent = [
  {
    id: "1",
    title: "Ecuaciones Cuadráticas: Método de Factorización",
    creator: "Prof. María González",
    institution: "Instituto San Martín",
    tags: ["matemáticas", "álgebra", "ecuaciones"],
    category: "Matemáticas",
    grade: "Secundaria",
    likes: 1240,
    comments: 89,
    thumbnail: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop"
  },
  {
    id: "2",
    title: "Fotosíntesis: El proceso que da vida al planeta",
    creator: "Dr. Carlos Méndez",
    institution: "Colegio Nacional",
    tags: ["biología", "plantas", "ciencia"],
    category: "Ciencias",
    grade: "Primaria",
    likes: 2150,
    comments: 143,
    thumbnail: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop"
  },
  {
    id: "3",
    title: "Verbos Irregulares en Inglés: Tips para Memorizar",
    creator: "Teacher Ana Smith",
    institution: "English Academy",
    tags: ["inglés", "gramática", "verbos"],
    category: "Lenguaje",
    grade: "Secundaria",
    likes: 980,
    comments: 67,
    thumbnail: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop"
  },
  {
    id: "4",
    title: "La Revolución Francesa: Causas y Consecuencias",
    creator: "Prof. Roberto Díaz",
    institution: "Liceo Histórico",
    tags: ["historia", "francia", "revolución"],
    category: "Historia",
    grade: "Secundaria",
    likes: 1530,
    comments: 102,
    thumbnail: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800&auto=format&fit=crop"
  },
  {
    id: "5",
    title: "Introducción a la Programación con Python",
    creator: "Dev. Laura Rodríguez",
    institution: "TechEdu",
    tags: ["programación", "python", "código"],
    category: "Tecnología",
    grade: "Preparatoria",
    likes: 3200,
    comments: 215,
    thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop"
  },
];

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contentIdFromUrl = searchParams.get("content");
  const { user, loading: authLoading } = useAuth();
  const { content, isLoading } = useContent();
  const { likes } = useUserLikes();
  const { saves } = useUserSaves();
  const videoRefs = useRef<{ [key: string]: VideoPlayerRef | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const { shouldShowOnboarding, initialStep, openOnboarding, closeOnboarding } = useOnboardingTrigger();
  const [isAnyVideoPlaying, setIsAnyVideoPlaying] = useState(false);

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
            // Auto-play the video after a short delay
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
  }, [pauseAllVideos, content]);

  // Scroll to specific content when contentId is in URL
  useEffect(() => {
    if (contentIdFromUrl && content && containerRef.current) {
      const contentIndex = content.findIndex((item) => item.id === contentIdFromUrl);
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
  }, [contentIdFromUrl, content]);

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

  const contentData = content || mockContent.map(item => ({
    ...item,
    profiles: {
      username: item.creator,
      full_name: item.creator,
      avatar_url: null,
      institution: item.institution,
      is_verified: false
    }
  }));

  return (
    <div className="relative">
      {/* Feed container with snap scroll */}
      <div ref={containerRef} className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth">
        {contentData.map((item: any, index: number) => {
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
              creator={item.profiles?.username || item.creator}
              institution={item.profiles?.institution || item.institution}
              tags={Array.isArray(item.tags) ? item.tags : []}
              category={item.category}
              thumbnail={item.thumbnail_url || item.thumbnail}
              videoUrl={item.video_url}
              documentUrl={item.documento_url}
              likes={item.likes_count || item.likes}
              comments={item.comments_count || item.comments}
              grade={item.grade_level || item.grade}
              isLiked={likes.has(item.id)}
              isSaved={saves.has(item.id)}
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
              onPlayStateChange={setIsAnyVideoPlaying}
            />
          );
        })}
      </div>

      {/* Floating action button */}
      <FloatingActionButton />

      {/* Bottom navigation - hidden when video is playing on mobile */}
      <div className={`transition-transform duration-300 ${isAnyVideoPlaying ? 'md:translate-y-0 translate-y-full' : 'translate-y-0'}`}>
        <BottomNav />
      </div>

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
  );
};

export default Index;
