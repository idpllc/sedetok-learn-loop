import { Heart, Share2, Bookmark, Play, Pause, Volume2, VolumeX, UserPlus, UserCheck, MessageCircle, Download, Columns3, ArrowRightLeft, CircleDot, MapPin, ClipboardList, Printer, Loader2 } from "lucide-react";
import { getQuizScientistIcon } from "@/lib/quizScientists";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useContent } from "@/hooks/useContent";
import { VideoPlayer, VideoPlayerRef } from "./VideoPlayer";
import { useViews } from "@/hooks/useViews";
import { useXP } from "@/hooks/useXP";
import { ShareSheet } from "./ShareSheet";
import { AuthModal } from "./AuthModal";
import { ReadingModal } from "./ReadingModal";
import { MindMapModal } from "./mindmap/MindMapModal";
import { MindMapViewer } from "./mindmap/MindMapViewer";
import { QuizViewer } from "./QuizViewer";
import { GameViewer } from "./GameViewer";
import { useQuizAttempts } from "@/hooks/useQuizAttempts";
import { BookOpen, Brain } from "lucide-react";
import { ContentInfoSheet } from "./ContentInfoSheet";
import { forwardRef, useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFollow } from "@/hooks/useFollow";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { CreateUnifiedEvaluationEvent } from "./CreateUnifiedEvaluationEvent";
import { supabase } from "@/integrations/supabase/client";
import { PrintableQuiz } from "./quiz/PrintableQuiz";
import { renderRichContent } from "@/lib/renderRichContent";

interface ContentCardProps {
  id: string;
  title: string;
  description?: string;
  creator: string;
  creatorId: string;
  institution?: string;
  tags: string[];
  category: string;
  subject?: string;
  thumbnail?: string;
  videoUrl?: string;
  documentUrl?: string;
  richText?: string;
  mindMapData?: any;
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
  gameType?: string;
  onVideoWatched?: () => void;
  onReadComplete?: () => void;
  onDocumentDownload?: () => void;
  onQuizComplete?: (passed: boolean) => void;
  onGameComplete?: () => void;
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
  subject,
  thumbnail,
  videoUrl,
  documentUrl,
  richText,
  mindMapData,
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
  gameType,
  onVideoWatched,
  onReadComplete,
  onDocumentDownload,
  onQuizComplete,
  onGameComplete,
}, ref) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { likeMutation, saveMutation } = useContent();
  const { awardXP } = useXP();
  const { isFollowing, toggleFollow, isProcessing } = useFollow(creatorId);
  const { lastAttempt, hasAttempted } = useQuizAttempts(contentType === 'quiz' ? id : undefined);
  
  // Live like/comment counts
  const isQuizType = contentType === 'quiz';
  const isGameType = contentType === 'game';
  const idField = isGameType ? 'game_id' : isQuizType ? 'quiz_id' : 'content_id';

  const { data: liveLikeCount } = useQuery({
    queryKey: ['live-counts', 'likes', id],
    queryFn: async () => {
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq(idField, id);
      return count || 0;
    },
    initialData: initialLikes,
    staleTime: 5000,
  });

  const { data: liveCommentCount } = useQuery({
    queryKey: ['live-counts', 'comments', id],
    queryFn: async () => {
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq(idField, id);
      return count || 0;
    },
    initialData: initialComments,
    staleTime: 5000,
  });

  // Live isLiked / isSaved state
  const { data: liveIsLiked } = useQuery({
    queryKey: ['live-counts', 'user-liked', id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq(idField, id)
        .eq('user_id', user.id)
        .limit(1);
      return (data && data.length > 0) || false;
    },
    initialData: isLiked,
    enabled: !!user,
    staleTime: 5000,
  });

  const { data: liveIsSaved } = useQuery({
    queryKey: ['live-counts', 'user-saved', id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('saves')
        .select('id')
        .eq(idField, id)
        .eq('user_id', user.id)
        .limit(1);
      return (data && data.length > 0) || false;
    },
    initialData: isSaved,
    enabled: !!user,
    staleTime: 5000,
  });

  // Fetch user profile to check if they are a teacher
  const { data: userProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('tipo_usuario')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'like' | 'save' | null>(null);
  const [isReadingModalOpen, setIsReadingModalOpen] = useState(false);
  const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [gameModalOpen, setGameModalOpen] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('videoMuted');
    return saved ? JSON.parse(saved) : false;
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('videoVolume');
    return saved ? parseFloat(saved) : 1;
  });
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoPlayerRef = useRef<VideoPlayerRef>(null);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);
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
    likeMutation.mutate({ contentId: id, isLiked: liveIsLiked || false, isQuiz: isQuizType, isGame: isGameType });
    if (!liveIsLiked) {
      awardXP(id, 'like', isQuizType || isGameType);
    }
  };

  const handleSave = () => {
    if (!user) {
      setPendingAction('save');
      setAuthModalOpen(true);
      return;
    }
    saveMutation.mutate({ contentId: id, isSaved: liveIsSaved || false, isQuiz: isQuizType, isGame: isGameType });
    if (!liveIsSaved) {
      awardXP(id, 'save', isQuizType || isGameType);
    }
  };

  const handleAuthSuccess = () => {
    if (pendingAction === 'like') {
      likeMutation.mutate({ contentId: id, isLiked: false, isQuiz: isQuizType, isGame: isGameType });
      awardXP(id, 'like', isQuizType || isGameType);
    } else if (pendingAction === 'save') {
      saveMutation.mutate({ contentId: id, isSaved: false, isQuiz: isQuizType, isGame: isGameType });
      awardXP(id, 'save', isQuizType || isGameType);
    }
    setPendingAction(null);
  };

  const handleVideoComplete = () => {
    if (user) {
      awardXP(id, 'view_complete');
    }
  };

  const handleAutoCreateEvaluation = (type: 'quiz' | 'game') => {
    if (!user) return;
    const param = type === 'quiz' ? `createQuizId=${id}` : `createGameId=${id}`;
    // Use window.location for reliable navigation from SedeTok fullscreen context
    window.location.href = `/quiz-evaluations?${param}`;
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
    const newMutedState = !isMuted;
    videoPlayerRef.current?.setMuted(newMutedState);
    setIsMuted(newMutedState);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    videoPlayerRef.current?.setVolume(newVolume);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // Sync volume slider visibility on mount
  useEffect(() => {
    if (videoUrl && !isMuted && volume > 0) {
      setShowVolumeSlider(false);
    }
  }, [videoUrl, isMuted, volume]);

  return (
    <div ref={setRefs} className="relative h-screen w-full snap-start snap-always flex items-center justify-center bg-black">
      {/* Video/Content container */}
      <div className="relative isolate w-full h-full max-w-4xl overflow-hidden flex items-center justify-center">
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
            onVideoWatched={onVideoWatched}
          />
        ) : documentUrl || (contentType === 'documento' && thumbnail) ? (
          (() => {
            const resourceUrl = documentUrl || thumbnail || '';
            const fileExt = resourceUrl.split('.').pop()?.split('?')[0]?.toUpperCase() || 'ARCHIVO';
            const extColorMap: Record<string, string> = {
              PDF: 'from-red-600 via-red-500 to-orange-500',
              DOC: 'from-blue-700 via-blue-500 to-cyan-500',
              DOCX: 'from-blue-700 via-blue-500 to-cyan-500',
              XLS: 'from-green-700 via-green-500 to-emerald-500',
              XLSX: 'from-green-700 via-green-500 to-emerald-500',
              PPT: 'from-orange-600 via-orange-500 to-amber-500',
              PPTX: 'from-orange-600 via-orange-500 to-amber-500',
              ZIP: 'from-yellow-600 via-yellow-500 to-amber-400',
              RAR: 'from-yellow-600 via-yellow-500 to-amber-400',
              PNG: 'from-pink-600 via-fuchsia-500 to-purple-500',
              JPG: 'from-pink-600 via-fuchsia-500 to-purple-500',
              JPEG: 'from-pink-600 via-fuchsia-500 to-purple-500',
              MP3: 'from-violet-600 via-purple-500 to-indigo-500',
              MP4: 'from-indigo-600 via-blue-500 to-violet-500',
            };
            const gradientClass = extColorMap[fileExt] || 'from-slate-700 via-slate-600 to-slate-500';
            return (
              <div className="w-full h-full flex items-center justify-center relative pointer-events-none overflow-hidden">
                {/* Animated gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} animate-pulse`} style={{ animationDuration: '4s' }} />
                
                {/* Decorative pattern */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                
                {/* Thumbnail overlay if available */}
                {thumbnail && (
                  <>
                    <img src={thumbnail} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-30" loading="lazy" width={400} height={300} />
                    <div className="absolute inset-0 bg-black/50" />
                  </>
                )}
                
                {/* Central content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-[999] gap-4">
                  {/* File type badge */}
                  <div className="bg-white/20 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/30 shadow-2xl">
                    <span className="text-white font-bold text-2xl tracking-widest">.{fileExt}</span>
                  </div>
                  
                  <p className="text-white/80 text-sm font-medium max-w-xs text-center truncate px-4">
                    {title}
                  </p>
                  
                  <Button
                    size="lg"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!resourceUrl) return;
                      try {
                        const { data, error } = await supabase.functions.invoke("download-file", {
                          body: { url: resourceUrl, filename: resourceUrl.split("/").pop() || "recurso" },
                        });
                        if (error) throw error;
                        if ((data as any)?.fallback) {
                          window.open(resourceUrl, "_blank", "noopener,noreferrer");
                        } else {
                          const blob = data instanceof Blob ? data : new Blob([data], { type: "application/octet-stream" });
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = resourceUrl.split("/").pop() || "recurso";
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                        }
                        onDocumentDownload?.();
                        // Post automatic download comment + mark progress in enrolled paths
                        if (user) {
                          try {
                            const { data: existing } = await supabase
                              .from("comments")
                              .select("id")
                              .eq("user_id", user.id)
                              .eq("content_id", id)
                              .like("comment_text", "%📥 Recurso descargado%")
                              .maybeSingle();
                            if (!existing) {
                              await supabase.from("comments").insert({
                                user_id: user.id,
                                content_id: id,
                                comment_text: `📥 Recurso descargado`,
                              });
                            }
                          } catch (err) {
                            console.error("Error posting download comment:", err);
                          }

                          // Mark progress in all enrolled paths that contain this content
                          try {
                            const { data: pathItems } = await supabase
                              .from("learning_path_content")
                              .select("path_id")
                              .eq("content_id", id);
                            const pathIds = Array.from(new Set((pathItems || []).map((p: any) => p.path_id)));
                            if (pathIds.length > 0) {
                              const { data: enrollments } = await supabase
                                .from("path_enrollments")
                                .select("path_id")
                                .eq("user_id", user.id)
                                .in("path_id", pathIds);
                              const enrolledPathIds = (enrollments || []).map((e: any) => e.path_id);
                              for (const pId of enrolledPathIds) {
                                const { data: existingProgress } = await supabase
                                  .from("user_path_progress")
                                  .select("id")
                                  .eq("user_id", user.id)
                                  .eq("path_id", pId)
                                  .eq("content_id", id)
                                  .is("quiz_id", null)
                                  .is("game_id", null)
                                  .maybeSingle();
                                const payload: any = {
                                  user_id: user.id,
                                  path_id: pId,
                                  content_id: id,
                                  quiz_id: null,
                                  game_id: null,
                                  completed: true,
                                  completed_at: new Date().toISOString(),
                                  progress_data: { downloaded: true },
                                };
                                if (existingProgress) {
                                  await supabase.from("user_path_progress").update(payload).eq("id", existingProgress.id);
                                } else {
                                  await supabase.from("user_path_progress").insert(payload);
                                }
                              }
                            }
                          } catch (err) {
                            console.error("Error marking path progress on download:", err);
                          }
                        }
                      } catch (error) {
                        console.error("Error downloading file:", error);
                        window.open(resourceUrl, "_blank", "noopener,noreferrer");
                      }
                    }}
                    className="flex items-center gap-3 shadow-2xl bg-white text-black hover:bg-white/90 text-lg px-8 py-6 hover:scale-105 transition-all duration-300 pointer-events-auto rounded-full font-bold"
                  >
                    <Download className="w-6 h-6" />
                    Descargar {fileExt}
                  </Button>
                </div>
              </div>
            );
          })()

        ) : contentType === 'lectura' && richText ? (
          <div className="w-full h-full flex items-center justify-center p-4 relative z-20">
            <div className="w-full max-w-2xl bg-background/95 backdrop-blur-sm rounded-lg p-6 shadow-xl overflow-hidden">
              <div
                className="prose prose-sm max-w-none line-clamp-[20] text-foreground rich-content"
                dangerouslySetInnerHTML={{ __html: renderRichContent(richText) }}
              />
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
        ) : contentType === 'mapa_mental' && mindMapData?.root ? (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100 dark:from-emerald-950/60 dark:via-teal-950/60 dark:to-cyan-950/60" >
            <div className="w-full h-full flex items-center justify-center p-4 relative z-20">
              <div className="w-full max-w-3xl bg-background/95 backdrop-blur-sm rounded-2xl p-5 shadow-2xl overflow-hidden max-h-[78vh] flex flex-col border border-border">
                <div className="flex items-center gap-2 pb-3 border-b border-border mb-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Brain className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Mapa Mental</p>
                    <h3 className="text-base font-bold truncate">{title || mindMapData.root.title}</h3>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden pointer-events-auto rounded-lg border border-border bg-muted/20 min-h-[200px]">
                  <MindMapViewer data={mindMapData} height="100%" />
                </div>
                <div className="mt-4 flex justify-center">
                  <Button
                    size="lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMindMapModalOpen(true);
                    }}
                    className="flex items-center gap-2 shadow-lg pointer-events-auto"
                  >
                    <BookOpen className="w-5 h-5" />
                    Abrir mapa
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : contentType === 'quiz' ? (
          (() => {
            const scientist = getQuizScientistIcon(category);
            return (
              <div className="w-full h-full bg-gradient-to-br from-purple-500/30 via-pink-500/30 to-blue-500/30 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
                <div className="text-center p-8 relative z-10">
                  <div className="mb-6">
                    <img 
                      src={scientist.icon} 
                      alt={scientist.name}
                      className="w-32 h-32 mx-auto rounded-full shadow-2xl border-4 border-white/30 object-cover animate-bounce"
                      loading="lazy"
                      width={128}
                      height={128}
                    />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-4">{title}</h3>
                  
                  {hasAttempted && lastAttempt && (
                    <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                      <p className="text-white/90 text-xs font-semibold mb-1.5">Tu último resultado:</p>
                      <div className="flex items-center justify-center gap-3 text-white">
                        <span className="text-xl font-bold">{lastAttempt.score} / {lastAttempt.max_score}</span>
                        <span className="text-base">
                          {lastAttempt.passed ? '✅ Aprobado' : '❌ No aprobado'}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-8 flex flex-col items-center gap-3">
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
                    
                    {user && (user.id === creatorId || userProfile?.tipo_usuario === 'Docente') && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleAutoCreateEvaluation('quiz');
                          }}
                          className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm pointer-events-auto relative z-20"
                        >
                          <ClipboardList className="w-4 h-4 mr-2" />
                          Evaluar este quiz
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPrintModal(true);
                          }}
                          className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm pointer-events-auto"
                        >
                          <Printer className="w-4 h-4 mr-2" />
                          Imprimir Quiz
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()
        ) : contentType === 'game' ? (
          (() => {
            const isWordOrder = gameType === "word_order" || !gameType;
            const isColumnMatch = gameType === "column_match";
            const isWordWheel = gameType === "word_wheel";
            const isInteractiveImage = gameType === "interactive_image";
            
            return (
              <div className={`w-full h-full flex items-center justify-center relative overflow-hidden ${
                isColumnMatch 
                  ? "bg-gradient-to-br from-emerald-500/30 via-teal-500/30 to-cyan-500/30"
                  : isWordWheel
                  ? "bg-gradient-to-br from-orange-500/30 via-yellow-500/30 to-red-500/30"
                  : isInteractiveImage
                  ? "bg-gradient-to-br from-pink-500/30 via-rose-500/30 to-fuchsia-500/30"
                  : "bg-gradient-to-br from-blue-500/30 via-indigo-500/30 to-purple-500/30"
              }`}>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
                <div className="text-center p-8 relative z-10">
                  <div className="mb-6">
                    <div className="w-32 h-32 mx-auto rounded-full shadow-2xl border-4 border-white/30 bg-white/10 backdrop-blur-sm flex items-center justify-center animate-bounce">
                      {isColumnMatch ? (
                        <Columns3 className="w-16 h-16 text-white" />
                      ) : isWordWheel ? (
                        <CircleDot className="w-16 h-16 text-white" />
                      ) : isInteractiveImage ? (
                        <MapPin className="w-16 h-16 text-white" />
                      ) : (
                        <ArrowRightLeft className="w-16 h-16 text-white" />
                      )}
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{title}</h3>
                  <p className="text-white/90 text-base mb-2">
                    {isColumnMatch ? "🔗 Conectar Columnas" : isWordWheel ? "🎯 Ruleta de Palabras" : isInteractiveImage ? "📍 Imagen Interactiva" : "🔤 Ordenar Palabras"}
                  </p>
                  <p className="text-white/80 text-sm mb-2">{questionsCount} preguntas</p>
                  
                  <div className="mt-8 flex flex-col gap-3 items-center">
                    <Button
                      size="lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setGameModalOpen(true);
                      }}
                      className="bg-white hover:bg-white/90 text-blue-600 font-bold text-lg px-8 py-6 shadow-2xl hover:scale-105 transition-transform pointer-events-auto"
                    >
                      🎯 Jugar Ahora
                    </Button>
                    
                    {user && (user.id === creatorId || userProfile?.tipo_usuario === 'Docente') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleAutoCreateEvaluation('game');
                        }}
                        className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm pointer-events-auto relative z-20"
                      >
                        <ClipboardList className="w-4 h-4 mr-2" />
                        Evaluar este juego
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()
        ) : thumbnail ? (
          <img 
            src={thumbnail} 
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
            width={400}
            height={300}
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

        {/* Overlay gradient - hidden when video is playing */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-transparent pointer-events-none z-0 transition-opacity duration-300 ${videoUrl && isPlaying && isFullscreen ? 'opacity-0' : 'opacity-100'}`} />

        {/* Desktop volume controls - top left corner like TikTok - hidden when playing */}
        {videoUrl && (
          <div
            className={`hidden md:flex absolute left-4 top-4 z-[100] items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-2 shadow-xl transition-opacity duration-300 ${isPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); toggleMute(); setShowVolumeSlider(true); }}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(e) => { e.stopPropagation(); handleVolumeChange(e); }}
              onFocus={() => setShowVolumeSlider(true)}
              onBlur={() => setShowVolumeSlider(false)}
              aria-hidden={!showVolumeSlider}
              className={`${showVolumeSlider ? 'w-24 opacity-100' : 'w-0 opacity-0 pointer-events-none'} transition-all duration-200 h-1 appearance-none bg-white/30 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md`}
            />
          </div>
        )}

        {/* Content info - hidden when video is playing */}
        <div className={`absolute bottom-16 md:bottom-6 lg:bottom-8 left-0 right-0 px-4 md:px-6 pb-4 z-10 transition-opacity duration-300 ${videoUrl && isPlaying && isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
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
                  className="text-sm text-white/90 text-left block mb-2"
                  onClick={() => setInfoSheetOpen(true)}
                >
                  {description.length > 80 ? `${description.slice(0, 80)}...` : description}
                  {description.length > 80 && (
                    <span className="ml-1 font-semibold">más</span>
                  )}
                </button>
              )}
              
              {/* Category and grade badges below description */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="pink" className="font-semibold text-xs">
                  {subject || category}
                </Badge>
                <Badge variant="secondary" className="font-semibold text-xs bg-white/20 text-white border-white/30">
                  {grade}
                </Badge>
                {contentType === 'quiz' && questionsCount && (
                  <Badge className="bg-white/20 text-white border-white/40 text-xs">
                    📝 {questionsCount}
                  </Badge>
                )}
                {contentType === 'quiz' && difficulty && (
                  <Badge className="bg-white/20 text-white border-white/40 text-xs">
                    {difficulty === 'basico' ? '⭐' : 
                     difficulty === 'intermedio' ? '⭐⭐' : 
                     '⭐⭐⭐'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons - floating on the right, centered vertically */}
        <div className={`absolute right-4 md:right-8 lg:right-12 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-30 transition-opacity duration-300 ${videoUrl && isPlaying && isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${isInView ? 'md:fixed md:flex' : 'md:hidden'}`}>
          {/* Creator avatar with follow button */}
          <div className="relative flex flex-col items-center">
            <button
              onClick={() => navigate(`/profile/${creatorId}`)}
              className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg"
            >
              {creatorAvatar ? (
                <img src={creatorAvatar} alt={creator} className="w-full h-full object-cover" loading="lazy" width={48} height={48} />
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
              liveIsLiked ? 'bg-red-500' : 'bg-white/90'
            } backdrop-blur-sm`}>
              <Heart 
                className={`w-5 h-5 ${liveIsLiked ? 'fill-white text-white' : 'text-black'}`}
              />
            </div>
            <span className="text-xs font-semibold text-white drop-shadow-lg">{liveLikeCount}</span>
          </button>

          <button
            onClick={() => setInfoSheetOpen(true)}
            className="flex flex-col items-center gap-1 transition-all hover:scale-110"
          >
            <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white">
              <MessageCircle className="w-5 h-5 text-black" />
            </div>
            <span className="text-xs font-semibold text-white drop-shadow-lg">{liveCommentCount}</span>
          </button>

          <button 
            onClick={handleSave}
            className="flex flex-col items-center gap-1 transition-all hover:scale-110"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
              liveIsSaved ? 'bg-yellow-500' : 'bg-white/90'
            } backdrop-blur-sm`}>
              <Bookmark 
                className={`w-5 h-5 ${liveIsSaved ? 'fill-white text-white' : 'text-black'}`}
              />
            </div>
          </button>

          <ShareSheet 
            contentId={id} 
            contentTitle={title} 
            isQuiz={contentType === 'quiz'}
            isGame={contentType === 'game'}
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

                {/* volume controls moved to left side */}
            </>
          )}
        </div>
      </div>

      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen}
        onSuccess={handleAuthSuccess}
      />


      {/* Reading Modal */}
      {richText && (
        <ReadingModal
          isOpen={isReadingModalOpen}
          onClose={() => setIsReadingModalOpen(false)}
          title={title}
          content={richText}
          onReadComplete={onReadComplete}
        />
      )}

      {/* Mind Map Modal */}
      {mindMapData?.root && (
        <MindMapModal
          isOpen={isMindMapModalOpen}
          onClose={() => setIsMindMapModalOpen(false)}
          title={title}
          data={mindMapData}
          onReadComplete={onReadComplete}
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
        commentsCount={liveCommentCount || 0}
        isQuiz={contentType === 'quiz'}
        isGame={contentType === 'game'}
        questionsCount={questionsCount}
        difficulty={difficulty}
      />

      {/* Quiz Viewer Dialog */}
      {contentType === 'quiz' && (
        <Dialog open={quizModalOpen} onOpenChange={setQuizModalOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] overflow-hidden p-0">
            <div className="h-[90vh] overflow-y-auto overflow-x-hidden">
              {quizModalOpen && (
                <QuizViewer 
                  quizId={id} 
                  lastAttempt={lastAttempt}
                  onComplete={() => {
                    setQuizModalOpen(false);
                    if (user) {
                      queryClient.invalidateQueries({ queryKey: ["quiz-attempts", id, user.id] });
                    }
                  }}
                  onQuizComplete={(passed) => {
                    if (passed && onQuizComplete) {
                      onQuizComplete(passed);
                    }
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Game Viewer Dialog */}
      {contentType === 'game' && (
        <Dialog open={gameModalOpen} onOpenChange={setGameModalOpen}>
          <DialogContent className="w-full md:w-[calc(100vw-2rem)] md:max-w-4xl h-[100dvh] max-h-[100dvh] md:max-h-[90vh] overflow-hidden p-0 m-0 md:m-4 z-[100] [&~*]:z-[100]">
            <div className="h-[100dvh] md:h-[90vh] overflow-y-auto overflow-x-hidden overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              <GameViewer 
                gameId={id}
                onComplete={() => {
                  setGameModalOpen(false);
                  onGameComplete?.();
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Evaluation Event Modal */}
      {(contentType === 'quiz' || contentType === 'game') && user && (user.id === creatorId || userProfile?.tipo_usuario === 'Docente') && (
        <CreateUnifiedEvaluationEvent
          quizId={contentType === 'quiz' ? id : undefined}
          gameId={contentType === 'game' ? id : undefined}
          open={showEvaluationModal}
          onOpenChange={setShowEvaluationModal}
        />
      )}

      {/* Printable Quiz Modal */}
      {contentType === 'quiz' && user && (user.id === creatorId || userProfile?.tipo_usuario === 'Docente') && (
        <PrintableQuiz
          quizId={id}
          quizTitle={title}
          open={showPrintModal}
          onOpenChange={setShowPrintModal}
        />
      )}
    </div>
  );
});
