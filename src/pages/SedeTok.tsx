import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useInfiniteContent, useUserLikes, useUserSaves } from "@/hooks/useContent";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MessageCircle, Bookmark, Share2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getQuizScientistIcon } from "@/lib/quizScientists";

const SedeTok = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteContent();
  const { likes } = useUserLikes();
  const { saves } = useUserSaves();

  const allContent = data?.pages.flatMap(page => page.items) || [];

  // Infinite scroll - load more when near bottom
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (scrollHeight - scrollTop - clientHeight < 500 && hasNextPage) {
        fetchNextPage();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [hasNextPage, fetchNextPage]);

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
  });

  const handleLike = (contentId: string, isLiked: boolean, isQuiz?: boolean, isGame?: boolean) => {
    if (!user) {
      toast({ title: "Debes iniciar sesión", variant: "destructive" });
      return;
    }
    likeMutation.mutate({ contentId, isLiked, isQuiz, isGame });
  };

  const handleSave = (contentId: string, isSaved: boolean, isQuiz?: boolean, isGame?: boolean) => {
    if (!user) {
      toast({ title: "Debes iniciar sesión", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ contentId, isSaved, isQuiz, isGame });
  };

  const handleShare = (content: any) => {
    const contentType = content.content_type;
    const shareUrl = `${window.location.origin}/?${contentType === 'quiz' ? 'quiz' : contentType === 'game' ? 'game' : 'content'}=${content.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: content.title,
        text: content.description || '',
        url: shareUrl,
      }).catch(() => {
        navigator.clipboard.writeText(shareUrl);
        toast({ title: "Link copiado al portapapeles" });
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copiado al portapapeles" });
    }
  };

  const handleComments = (content: any) => {
    const contentType = content.content_type;
    navigate(`/?${contentType === 'quiz' ? 'quiz' : contentType === 'game' ? 'game' : 'content'}=${content.id}`);
  };

  if (isLoading) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen bg-background md:ml-64 flex items-center justify-center">
          <Skeleton className="w-full max-w-md h-[600px] rounded-xl" />
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div 
        ref={containerRef}
        className="h-screen overflow-y-scroll snap-y snap-mandatory bg-background md:ml-64 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {allContent.map((content, index) => {
          const isQuiz = content.content_type === 'quiz';
          const isGame = content.content_type === 'game';
          const isLiked = likes.has(content.id);
          const isSaved = saves.has(content.id);
          const profile = content.profiles as any;
          const scientist = isQuiz ? getQuizScientistIcon(content.category) : null;

          return (
            <div 
              key={content.id}
              className="relative h-screen w-full snap-start snap-always flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20"
            >
              {/* Content Display */}
              <div className="relative w-full max-w-md h-full flex flex-col justify-center px-4">
                {/* Thumbnail or Scientist Icon */}
                {content.thumbnail_url ? (
                  <img 
                    src={content.thumbnail_url} 
                    alt={content.title}
                    className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30"
                  />
                ) : scientist ? (
                  <img 
                    src={scientist.icon} 
                    alt={scientist.name}
                    className="absolute inset-0 w-full h-full object-contain blur-2xl opacity-20"
                  />
                ) : null}

                <div className="relative z-10 flex flex-col items-center">
                  <div 
                    className="w-full max-w-sm bg-card/80 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl border border-border cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => {
                      if (isQuiz) {
                        navigate(`/?quiz=${content.id}`);
                      } else if (isGame) {
                        navigate(`/?game=${content.id}`);
                      } else {
                        navigate(`/?content=${content.id}`);
                      }
                    }}
                  >
                    {content.thumbnail_url ? (
                      <img 
                        src={content.thumbnail_url} 
                        alt={content.title}
                        className="w-full h-64 object-cover"
                      />
                    ) : scientist ? (
                      <div className="w-full h-64 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <img src={scientist.icon} alt={scientist.name} className="w-40 h-40 object-contain" />
                      </div>
                    ) : (
                      <div className="w-full h-64 bg-gradient-to-br from-primary/20 to-secondary/20" />
                    )}

                    <div className="p-4 space-y-2">
                      <h2 className="text-xl font-bold line-clamp-2">{content.title}</h2>
                      {content.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{content.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Right Side */}
              <div className="absolute right-4 bottom-24 flex flex-col gap-6 z-20">
                <button
                  onClick={() => handleLike(content.id, isLiked, isQuiz, isGame)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-md flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
                  </div>
                  <span className="text-xs font-medium text-foreground">{content.likes_count || 0}</span>
                </button>

                <button
                  onClick={() => handleComments(content)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-md flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <MessageCircle className="w-6 h-6 text-foreground" />
                  </div>
                  <span className="text-xs font-medium text-foreground">{content.comments_count || 0}</span>
                </button>

                <button
                  onClick={() => handleSave(content.id, isSaved, isQuiz, isGame)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-md flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-primary text-primary' : 'text-foreground'}`} />
                  </div>
                </button>

                <button
                  onClick={() => handleShare(content)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-md flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <Share2 className="w-6 h-6 text-foreground" />
                  </div>
                </button>
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-4 left-4 right-20 z-20">
                <div className="space-y-2">
                  {profile && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-card/80 backdrop-blur-md overflow-hidden">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground">
                            {profile.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-foreground">{profile.username || profile.full_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Eye className="w-4 h-4" />
                    <span>{content.views_count || 0} vistas</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </>
  );
};

export default SedeTok;
