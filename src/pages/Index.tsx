import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { ContentCard } from "@/components/ContentCard";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingModal } from "@/components/OnboardingModal";
import { OnboardingTeaser } from "@/components/OnboardingTeaser";
import { useOnboardingTrigger } from "@/hooks/useOnboardingTrigger";
import { useContent, useUserLikes, useUserSaves } from "@/hooks/useContent";
import { useRelatedContent } from "@/hooks/useRelatedContent";
import { useTargetItem } from "@/hooks/useTargetItem";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayerRef } from "@/components/VideoPlayer";


const mockContent = [
  {
    id: "1",
    title: "Ecuaciones Cuadráticas: Método de Factorización",
    description: "Aprende a resolver ecuaciones cuadráticas usando el método de factorización paso a paso. En esta lección veremos ejemplos prácticos y ejercicios resueltos para dominar esta técnica fundamental del álgebra.",
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
    description: "Descubre cómo las plantas convierten la luz solar en energía mediante la fotosíntesis. Exploraremos las fases luminosa y oscura, los cloroplastos y la importancia de este proceso para la vida en la Tierra.",
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
    description: "Aprende los verbos irregulares más comunes en inglés con técnicas efectivas de memorización. Incluye ejemplos prácticos, frases útiles y trucos para recordar las formas en pasado y participio.",
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
    description: "Un análisis completo de la Revolución Francesa de 1789, sus causas sociales y económicas, los principales eventos y personajes, y su impacto en la historia moderna de Europa y el mundo.",
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
    description: "Da tus primeros pasos en el mundo de la programación con Python. Aprenderás los conceptos básicos: variables, tipos de datos, estructuras de control, funciones y mucho más con ejemplos prácticos.",
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const contentIdFromUrl = searchParams.get("content");
  const quizIdFromUrl = searchParams.get("quiz");
  const pathIdFromUrl = searchParams.get("path");
  const { user, loading: authLoading } = useAuth();
  const { content, isLoading } = useContent();
  const { data: targetItem, isLoading: isLoadingTarget } = useTargetItem(contentIdFromUrl || undefined, quizIdFromUrl || undefined);
  const { data: relatedContent, isLoading: isLoadingRelated } = useRelatedContent(contentIdFromUrl || undefined, quizIdFromUrl || undefined);
  const { likes } = useUserLikes();
  const { saves } = useUserSaves();
  const videoRefs = useRef<{ [key: string]: VideoPlayerRef | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const { shouldShowOnboarding, initialStep, openOnboarding, closeOnboarding } = useOnboardingTrigger();

  const currentTab = location.pathname === "/" ? "para-ti" : 
                     location.pathname === "/search" ? "explorar" : 
                     location.pathname === "/learning-paths" ? "rutas" : "para-ti";

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

  // Scroll to top when specific content is loaded from search
  useEffect(() => {
    const targetId = contentIdFromUrl || quizIdFromUrl;
    if (targetId && relatedContent && containerRef.current) {
      setTimeout(() => {
        const container = containerRef.current;
        if (container) {
          container.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [contentIdFromUrl, quizIdFromUrl, relatedContent]);

  // Redirect to learning path when pathId is in URL
  useEffect(() => {
    if (pathIdFromUrl) {
      navigate(`/learning-paths/${pathIdFromUrl}`);
    }
  }, [pathIdFromUrl, navigate]);

  // Show loading for related content when coming from search
  if ((contentIdFromUrl || quizIdFromUrl) && isLoadingTarget) {
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

  if (!contentIdFromUrl && !quizIdFromUrl && isLoading) {
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

  // Use related content if available (from search), otherwise use regular content feed
  const baseFallback = content || mockContent.map(item => ({
    ...item,
    profiles: {
      username: item.creator,
      full_name: item.creator,
      avatar_url: null,
      institution: item.institution,
      is_verified: false
    }
  }));

  const contentData = (contentIdFromUrl || quizIdFromUrl)
    ? (targetItem
        ? [
            targetItem as any,
            ...(((relatedContent as any[]) || []).filter((i: any) => i.id !== (targetItem as any).id)),
          ]
        : baseFallback)
    : baseFallback;

  return (
    <div className="relative">
      {/* Sidebar para desktop */}
      <Sidebar />
      
      {/* Main content con margen para el sidebar en desktop */}
      <div className="md:ml-64">

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
              description={item.description}
              creator={item.profiles?.username || item.creator}
              creatorId={item.creator_id || item.id}
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
    </div>
  );
};

export default Index;
