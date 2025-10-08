import { Heart, Share2, Bookmark } from "lucide-react";
import { Badge } from "./ui/badge";
import { useContent } from "@/hooks/useContent";
import { VideoPlayer, VideoPlayerRef } from "./VideoPlayer";
import { useViews } from "@/hooks/useViews";
import { useXP } from "@/hooks/useXP";
import { CommentsSheet } from "./CommentsSheet";
import { ShareSheet } from "./ShareSheet";
import { AuthModal } from "./AuthModal";
import { forwardRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface ContentCardProps {
  id: string;
  title: string;
  creator: string;
  institution?: string;
  tags: string[];
  category: string;
  thumbnail?: string;
  videoUrl?: string;
  likes: number;
  comments: number;
  grade: string;
  isLiked: boolean;
  isSaved: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  videoRef?: (ref: VideoPlayerRef | null) => void;
}

export const ContentCard = forwardRef<HTMLDivElement, ContentCardProps>(({
  id,
  title,
  creator,
  institution,
  tags,
  category,
  thumbnail,
  videoUrl,
  likes: initialLikes,
  comments: initialComments,
  grade,
  isLiked,
  isSaved,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  videoRef,
}, ref) => {
  const { user } = useAuth();
  const { likeMutation, saveMutation } = useContent();
  const { awardXP } = useXP();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'like' | 'save' | null>(null);
  useViews(id);

  const handleLike = () => {
    if (!user) {
      setPendingAction('like');
      setAuthModalOpen(true);
      return;
    }
    likeMutation.mutate({ contentId: id, isLiked });
    // Award XP only when liking (not unliking)
    if (!isLiked) {
      awardXP(id, 'like');
    }
  };

  const handleSave = () => {
    if (!user) {
      setPendingAction('save');
      setAuthModalOpen(true);
      return;
    }
    saveMutation.mutate({ contentId: id, isSaved });
    // Award XP only when saving (not unsaving)
    if (!isSaved) {
      awardXP(id, 'save');
    }
  };

  const handleAuthSuccess = () => {
    if (pendingAction === 'like') {
      likeMutation.mutate({ contentId: id, isLiked: false });
      awardXP(id, 'like');
    } else if (pendingAction === 'save') {
      saveMutation.mutate({ contentId: id, isSaved: false });
      awardXP(id, 'save');
    }
    setPendingAction(null);
  };

  const handleVideoComplete = () => {
    if (user) {
      awardXP(id, 'view_complete');
    }
  };

  return (
    <div ref={ref} className="relative h-screen w-full snap-start snap-always flex items-center justify-center bg-black">
      {/* Video/Content container */}
      <div className="relative w-full h-full max-w-4xl overflow-hidden flex items-center justify-center">
        {videoUrl ? (
          <VideoPlayer 
            ref={videoRef}
            videoUrl={videoUrl}
            thumbnail={thumbnail}
            onPrevious={onPrevious}
            onNext={onNext}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            contentId={id}
            onVideoComplete={handleVideoComplete}
          />
        ) : thumbnail ? (
          <img 
            src={thumbnail} 
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
              <p className="text-white/70">Contenido educativo</p>
            </div>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-transparent pointer-events-none" />

        {/* Category badge */}
        <div className="absolute top-4 left-4 z-10">
          <Badge className="bg-primary text-primary-foreground font-semibold">{category}</Badge>
        </div>

        {/* Grade badge */}
        <div className="absolute top-4 right-4 z-10">
          <Badge variant="secondary" className="font-semibold">{grade}</Badge>
        </div>

        {/* Content info */}
        <div className="absolute bottom-20 left-0 right-0 p-6 z-10">
          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
              <p className="text-sm text-white/80">
                {creator}
                {institution && <span className="text-white/60"> · {institution}</span>}
              </p>
            </div>

            {/* Tags */}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs border-white/30 text-white/90">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons - floating on the right */}
        <div className="absolute right-4 bottom-44 flex flex-col gap-4 z-30">
          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-1 transition-all hover:scale-110"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
              isLiked ? 'bg-red-500' : 'bg-white/90'
            } backdrop-blur-sm`}>
              <Heart 
                className={`w-6 h-6 ${isLiked ? 'fill-white text-white' : 'text-black'}`}
              />
            </div>
            <span className="text-xs font-semibold text-white">{initialLikes}</span>
          </button>

          <CommentsSheet contentId={id} commentsCount={initialComments} />

          <button 
            onClick={handleSave}
            className="flex flex-col items-center gap-1 transition-all hover:scale-110"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
              isSaved ? 'bg-yellow-500' : 'bg-white/90'
            } backdrop-blur-sm`}>
              <Bookmark 
                className={`w-6 h-6 ${isSaved ? 'fill-white text-white' : 'text-black'}`}
              />
            </div>
          </button>

          <ShareSheet contentId={id} contentTitle={title} />
        </div>
      </div>

      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
});
