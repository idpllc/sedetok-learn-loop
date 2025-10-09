import { Heart, Share2, Bookmark, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Badge } from "./ui/badge";
import { useContent } from "@/hooks/useContent";
import { VideoPlayer, VideoPlayerRef } from "./VideoPlayer";
import { useViews } from "@/hooks/useViews";
import { useXP } from "@/hooks/useXP";
import { CommentsSheet } from "./CommentsSheet";
import { ShareSheet } from "./ShareSheet";
import { AuthModal } from "./AuthModal";
import { PDFViewer } from "./PDFViewer";
import { PDFModal } from "./PDFModal";
import { forwardRef, useState, useEffect, useRef } from "react";
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
  documentUrl?: string;
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
  onPlayStateChange?: (isPlaying: boolean) => void;
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
  documentUrl,
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
  onPlayStateChange,
}, ref) => {
  const { user } = useAuth();
  const { likeMutation, saveMutation } = useContent();
  const { awardXP } = useXP();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'like' | 'save' | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPdfContent, setShowPdfContent] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  useViews(id);
  
  // Visibility detection to show action buttons only for the in-view card (desktop)
  const [isInView, setIsInView] = useState(false);
  const localRef = useRef<HTMLDivElement | null>(null);
  const setRefs = (node: HTMLDivElement | null) => {
    localRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref && (ref as any).current !== undefined) {
      (ref as any).current = node;
    }
  };
  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting && entry.intersectionRatio > 0.6);
      },
      { threshold: [0.5, 0.6, 0.75, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  const handleExpandPdf = () => {
    setPdfModalOpen(true);
  };

  const handlePlayStateChange = (playing: boolean) => {
    setIsPlaying(playing);
    onPlayStateChange?.(playing);
  };

  const togglePlayPause = () => {
    if (videoPlayerRef.current) {
      if (videoPlayerRef.current.isPlaying) {
        videoPlayerRef.current.pause();
      } else {
        videoPlayerRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    const video = document.querySelector(`[data-content-id="${id}"] video`) as HTMLVideoElement;
    if (video) {
      const newMutedState = !video.muted;
      video.muted = newMutedState;
      setIsMuted(newMutedState);
      setShowVolumeSlider(!newMutedState);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = document.querySelector(`[data-content-id="${id}"] video`) as HTMLVideoElement;
    if (video) {
      const newVolume = parseFloat(e.target.value);
      video.volume = newVolume;
      setVolume(newVolume);
      if (newVolume === 0) {
        setIsMuted(true);
        video.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        video.muted = false;
      }
    }
  };

  return (
    <div ref={setRefs} className="relative h-screen w-full snap-start snap-always flex items-center justify-center bg-black">
      {/* Video/Content container */}
      <div className="relative w-full h-full max-w-4xl overflow-hidden flex items-center justify-center">
        {videoUrl ? (
          <VideoPlayer 
            ref={(ref) => {
              videoPlayerRef.current = ref;
              if (videoRef) videoRef(ref);
            }}
            videoUrl={videoUrl}
            thumbnail={thumbnail}
            onPrevious={onPrevious}
            onNext={onNext}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            contentId={id}
            onVideoComplete={handleVideoComplete}
            onPlayStateChange={handlePlayStateChange}
          />
        ) : documentUrl ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            <div 
              className={`w-full max-w-2xl transition-opacity duration-300 ${showPdfContent ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowPdfContent(!showPdfContent);
              }}
            >
              <PDFViewer 
                fileUrl={documentUrl}
                onExpandClick={handleExpandPdf}
              />
            </div>
          </div>
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
        <div className={`absolute right-4 md:right-8 lg:right-12 bottom-32 md:bottom-40 md:top-auto md:translate-y-1/2 flex flex-col gap-4 md:gap-6 z-30 ${isInView ? 'md:fixed md:flex' : 'md:hidden'}`}>
          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-2 transition-all hover:scale-110"
          >
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-lg ${
              isLiked ? 'bg-red-500' : 'bg-white/90'
            } backdrop-blur-sm`}>
              <Heart 
                className={`w-6 h-6 md:w-7 md:h-7 ${isLiked ? 'fill-white text-white' : 'text-black'}`}
              />
            </div>
            <span className="text-xs md:text-sm font-semibold text-white drop-shadow-lg">{initialLikes}</span>
          </button>

          <CommentsSheet contentId={id} commentsCount={initialComments} />

          <button 
            onClick={handleSave}
            className="flex flex-col items-center gap-2 transition-all hover:scale-110"
          >
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-lg ${
              isSaved ? 'bg-yellow-500' : 'bg-white/90'
            } backdrop-blur-sm`}>
              <Bookmark 
                className={`w-6 h-6 md:w-7 md:h-7 ${isSaved ? 'fill-white text-white' : 'text-black'}`}
              />
            </div>
          </button>

          <ShareSheet contentId={id} contentTitle={title} />

          {/* Video controls - below share button */}
          {videoUrl && (
            <>
              <button
                onClick={togglePlayPause}
                className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform shadow-lg hover:bg-white"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 md:w-7 md:h-7 text-black" />
                ) : (
                  <Play className="w-6 h-6 md:w-7 md:h-7 text-black ml-0.5" />
                )}
              </button>

              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform shadow-lg hover:bg-white"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-6 h-6 md:w-7 md:h-7 text-black" />
                  ) : (
                    <Volume2 className="w-6 h-6 md:w-7 md:h-7 text-black" />
                  )}
                </button>

                {showVolumeSlider && (
                  <div className="flex flex-col items-center bg-white/90 backdrop-blur-sm rounded-full px-2 py-3 shadow-lg">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black -rotate-90 origin-center"
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen}
        onSuccess={handleAuthSuccess}
      />

      {/* PDF Modal */}
      {documentUrl && (
        <PDFModal
          open={pdfModalOpen}
          onOpenChange={setPdfModalOpen}
          fileUrl={documentUrl}
          title={title}
        />
      )}
    </div>
  );
});
