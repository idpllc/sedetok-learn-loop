import { Heart, Share2, Bookmark, Play, Pause, Volume2, VolumeX, UserPlus, UserCheck, MessageCircle, Download } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useContent } from "@/hooks/useContent";
import { VideoPlayer, VideoPlayerRef } from "./VideoPlayer";
import { useViews } from "@/hooks/useViews";
import { useXP } from "@/hooks/useXP";
import { ShareSheet } from "./ShareSheet";
import { AuthModal } from "./AuthModal";
import { PDFViewer } from "./PDFViewer";
import { PDFModal } from "./PDFModal";
import { ReadingModal } from "./ReadingModal";
import { QuizViewer } from "./QuizViewer";
import { useQuizAttempts } from "@/hooks/useQuizAttempts";
import { BookOpen } from "lucide-react";
import { ContentInfoSheet } from "./ContentInfoSheet";
import { forwardRef, useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFollow } from "@/hooks/useFollow";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

interface ContentCardProps {
  id: string;
  title: string;
  description?: string;
  creator: string;
  creatorId: string;
  institution?: string;
  tags: string[];
  category: string;
  thumbnail?: string;
  videoUrl?: string;
  documentUrl?: string;
  richText?: string;
  contentType?: string;
  likes: number;
  comments: number;
  shares: number;
  grade: string;
  isLiked: boolean;
  isSaved: boolean;
  creatorAvatar?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  videoRef?: (ref: VideoPlayerRef | null) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  questionsCount?: number;
  difficulty?: string;
}

export const ContentCard = forwardRef<HTMLDivElement, ContentCardProps>(({
  id,
  title,
  description,
  creator,
  creatorId,
  institution,
  tags,
  category,
  thumbnail,
  videoUrl,
  documentUrl,
  richText,
  contentType,
  likes: initialLikes,
  comments: initialComments,
  shares: initialShares,
  grade,
  isLiked,
  isSaved,
  creatorAvatar,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  videoRef,
  onPlayStateChange,
  questionsCount,
  difficulty,
}, ref) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { likeMutation, saveMutation } = useContent();
  const { awardXP } = useXP();
  const { isFollowing, toggleFollow, isProcessing } = useFollow(creatorId);
  const { lastAttempt, hasAttempted } = useQuizAttempts(contentType === 'quiz' ? id : undefined);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'like' | 'save' | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [isReadingModalOpen, setIsReadingModalOpen] = useState(false);
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
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
    const isQuiz = contentType === 'quiz';
    likeMutation.mutate({ contentId: id, isLiked, isQuiz });
    // Award XP only when liking (not unliking)
    if (!isLiked) {
      awardXP(id, 'like', isQuiz);
    }
  };

  const handleSave = () => {
    if (!user) {
      setPendingAction('save');
      setAuthModalOpen(true);
      return;
    }
    const isQuiz = contentType === 'quiz';
    saveMutation.mutate({ contentId: id, isSaved, isQuiz });
    // Award XP only when saving (not unsaving)
    if (!isSaved) {
      awardXP(id, 'save', isQuiz);
    }
  };

  const handleAuthSuccess = () => {
    const isQuiz = contentType === 'quiz';
    if (pendingAction === 'like') {
      likeMutation.mutate({ contentId: id, isLiked: false, isQuiz });
      awardXP(id, 'like', isQuiz);
    } else if (pendingAction === 'save') {
      saveMutation.mutate({ contentId: id, isSaved: false, isQuiz });
      awardXP(id, 'save', isQuiz);
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

  const handleExpandReading = () => {
    setIsReadingModalOpen(true);
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
          <div className="w-full h-full flex items-center justify-center p-4 relative">
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
                showDownloadButton={false}
              />
            </div>
            
            {/* Central download button */}
            <div className="absolute inset-0 flex items-center justify-center z-50">
              <Button
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  const link = document.createElement('a');
                  link.href = documentUrl;
                  link.download = documentUrl.split('/').pop() || 'documento';
                  link.target = '_blank';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="flex items-center gap-2 shadow-2xl bg-primary hover:bg-primary/90 text-lg px-8 py-6 hover:scale-105 transition-transform"
              >
                <Download className="w-6 h-6" />
                Descargar Recurso
              </Button>
            </div>
          </div>
        ) : contentType === 'lectura' && richText ? (
          <div className="w-full h-full flex items-center justify-center p-4 relative z-20">
            <div className="w-full max-w-2xl bg-background/95 backdrop-blur-sm rounded-lg p-6 shadow-xl overflow-hidden">
              <div className="prose prose-sm max-w-none line-clamp-[20] text-foreground">
                <div className="whitespace-pre-wrap leading-relaxed">
                  {richText}
                </div>
              </div>
              <div className="mt-6 flex justify-center">
                <Button
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExpandReading();
                  }}
                  className="flex items-center gap-2 shadow-lg pointer-events-auto"
                >
                  <BookOpen className="w-5 h-5" />
                  Leer más
                </Button>
              </div>
            </div>
          </div>
        ) : contentType === 'quiz' ? (
          <div className="w-full h-full bg-gradient-to-br from-purple-500/30 via-pink-500/30 to-blue-500/30 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
            <div className="text-center p-8 relative z-10">
              <div className="text-8xl mb-6 animate-bounce">🧠</div>
              <h3 className="text-3xl font-bold text-white mb-3">{title}</h3>
              <p className="text-white/90 text-lg">Quiz Interactivo</p>
              
              {hasAttempted && lastAttempt && (
                <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/30">
                  <p className="text-white/90 text-sm font-semibold mb-2">Tu último resultado:</p>
                  <div className="flex items-center justify-center gap-4 text-white">
                    <span className="text-2xl font-bold">{lastAttempt.score} / {lastAttempt.max_score}</span>
                    <span className="text-lg">
                      {lastAttempt.passed ? '✅ Aprobado' : '❌ No aprobado'}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex items-center justify-center gap-4">
                {questionsCount && (
                  <Badge className="bg-white/20 text-white border-white/40 text-sm px-4 py-1.5">
                    📝 {questionsCount} {questionsCount === 1 ? 'Pregunta' : 'Preguntas'}
                  </Badge>
                )}
                {difficulty && (
                  <Badge className="bg-white/20 text-white border-white/40 text-sm px-4 py-1.5">
                    {difficulty === 'basico' ? '⭐ Básico' : 
                     difficulty === 'intermedio' ? '⭐⭐ Intermedio' : 
                     '⭐⭐⭐ Avanzado'}
                  </Badge>
                )}
              </div>
              <div className="mt-8">
                <Button
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuizModalOpen(true);
                  }}
                  className="bg-white hover:bg-white/90 text-purple-600 font-bold text-lg px-8 py-6 shadow-2xl hover:scale-105 transition-transform pointer-events-auto"
                >
                  {hasAttempted ? '🔄 Responder nuevamente' : '🎯 Responder Quiz'}
                </Button>
              </div>
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
        <div className="absolute bottom-24 md:bottom-20 left-0 right-0 px-4 md:px-6 pb-4 z-10">
          <div className="space-y-2">
            <div>
              <button 
                onClick={() => navigate(`/profile/${creatorId}`)}
                className="text-xl font-bold text-white mb-1 text-left hover:underline"
              >
                {creator}
              </button>
              {institution && (
                <p className="text-sm text-white/80 mb-2">{institution}</p>
              )}
              
              {/* Description excerpt with "más" link */}
              {description && (
                <button 
                  className="text-sm text-white/90 text-left block"
                  onClick={() => setInfoSheetOpen(true)}
                >
                  {description.length > 80 ? `${description.slice(0, 80)}...` : description}
                  {description.length > 80 && (
                    <span className="ml-1 font-semibold">más</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons - floating on the right, centered vertically */}
        <div className={`absolute right-4 md:right-8 lg:right-12 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-30 ${isInView ? 'md:fixed md:flex' : 'md:hidden'}`}>
          {/* Creator avatar with follow button */}
          <div className="relative flex flex-col items-center">
            <button
              onClick={() => navigate(`/profile/${creatorId}`)}
              className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg"
            >
              {creatorAvatar ? (
                <img src={creatorAvatar} alt={creator} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/80 flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">{creator.charAt(0)}</span>
                </div>
              )}
            </button>
            {user && user.id !== creatorId && (
              <Button
                size="icon"
                onClick={() => toggleFollow(creatorId)}
                disabled={isProcessing}
                className="absolute -bottom-2 w-6 h-6 rounded-full bg-primary hover:bg-primary/90 shadow-lg p-0"
              >
                {isFollowing ? (
                  <UserCheck className="w-3 h-3" />
                ) : (
                  <UserPlus className="w-3 h-3" />
                )}
              </Button>
            )}
          </div>

          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-1 transition-all hover:scale-110"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
              isLiked ? 'bg-red-500' : 'bg-white/90'
            } backdrop-blur-sm`}>
              <Heart 
                className={`w-5 h-5 ${isLiked ? 'fill-white text-white' : 'text-black'}`}
              />
            </div>
            <span className="text-xs font-semibold text-white drop-shadow-lg">{initialLikes}</span>
          </button>

          <button
            onClick={() => setInfoSheetOpen(true)}
            className="flex flex-col items-center gap-1 transition-all hover:scale-110"
          >
            <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white">
              <MessageCircle className="w-5 h-5 text-black" />
            </div>
            <span className="text-xs font-semibold text-white drop-shadow-lg">{initialComments}</span>
          </button>

          <button 
            onClick={handleSave}
            className="flex flex-col items-center gap-1 transition-all hover:scale-110"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
              isSaved ? 'bg-yellow-500' : 'bg-white/90'
            } backdrop-blur-sm`}>
              <Bookmark 
                className={`w-5 h-5 ${isSaved ? 'fill-white text-white' : 'text-black'}`}
              />
            </div>
          </button>

          <ShareSheet 
            contentId={id} 
            contentTitle={title} 
            isQuiz={contentType === 'quiz'}
            sharesCount={initialShares}
          />

          {/* Video controls - hidden on mobile */}
          {videoUrl && (
            <>
              <button
                onClick={togglePlayPause}
                className="hidden md:flex w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm items-center justify-center hover:scale-110 transition-transform shadow-lg hover:bg-white"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-black" />
                ) : (
                  <Play className="w-5 h-5 text-black ml-0.5" />
                )}
              </button>

              <div className="hidden md:flex flex-col items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform shadow-lg hover:bg-white"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 text-black" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-black" />
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

      {/* Reading Modal */}
      {richText && (
        <ReadingModal
          isOpen={isReadingModalOpen}
          onClose={() => setIsReadingModalOpen(false)}
          title={title}
          content={richText}
        />
      )}

      {/* Content Info Sheet with Comments */}
      <ContentInfoSheet
        open={infoSheetOpen}
        onOpenChange={setInfoSheetOpen}
        contentId={id}
        title={title}
        description={description || ""}
        creator={creator}
        institution={institution}
        tags={tags}
        creatorAvatar={creatorAvatar}
        commentsCount={initialComments}
        isQuiz={contentType === 'quiz'}
      />

      {/* Quiz Viewer Dialog */}
      {contentType === 'quiz' && (
        <Dialog open={quizModalOpen} onOpenChange={setQuizModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <p className="text-sm text-muted-foreground">{description}</p>
            </DialogHeader>
            <QuizViewer 
              quizId={id} 
              lastAttempt={lastAttempt}
              onComplete={() => {
                setQuizModalOpen(false);
                // Refrescar los intentos del quiz después de completarlo
                if (user) {
                  queryClient.invalidateQueries({ queryKey: ["quiz-attempts", id, user.id] });
                }
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
});
