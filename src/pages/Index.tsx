import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ContentCard } from "@/components/ContentCard";
import { BottomNav } from "@/components/BottomNav";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { useAuth } from "@/hooks/useAuth";
import { useContent, useUserLikes, useUserSaves } from "@/hooks/useContent";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { user, loading: authLoading } = useAuth();
  const { content, isLoading } = useContent();
  const { likes } = useUserLikes();
  const { saves } = useUserSaves();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4 animate-pulse">📚</div>
          <p className="text-muted-foreground">Cargando SEDETOK...</p>
        </div>
      </div>
    );
  }

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
      <div className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth">
        {contentData.map((item: any) => (
          <ContentCard
            key={item.id}
            id={item.id}
            title={item.title}
            creator={item.profiles?.username || item.creator}
            institution={item.profiles?.institution || item.institution}
            tags={item.tags || []}
            category={item.category}
            thumbnail={item.thumbnail_url || item.thumbnail}
            videoUrl={item.video_url}
            likes={item.likes_count || item.likes}
            comments={item.comments_count || item.comments}
            grade={item.grade_level || item.grade}
            isLiked={likes.has(item.id)}
            isSaved={saves.has(item.id)}
          />
        ))}
      </div>

      {/* Floating action button */}
      <FloatingActionButton />

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
};

export default Index;
