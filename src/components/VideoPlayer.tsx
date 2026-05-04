import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Play, Pause, Volume2, VolumeX, ChevronUp, ChevronDown, Maximize, Minimize, Loader2 } from "lucide-react";
import { isYouTubeUrl, getYouTubeEmbedUrl, extractYouTubeId } from "@/lib/youtube";
import { isTikTokUrl, getTikTokEmbedUrl, extractTikTokId } from "@/lib/tiktok";

interface VideoPlayerProps {
  videoUrl: string;
  thumbnail?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  contentId?: string;
  onVideoComplete?: () => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onVideoWatched?: () => void;
}

export interface VideoPlayerRef {
  pause: () => void;
  play: () => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  isPlaying: boolean;
}

// ============== YouTube IFrame API loader ==============
let ytApiPromise: Promise<any> | null = null;
const loadYouTubeAPI = (): Promise<any> => {
  if (typeof window === "undefined") return Promise.reject();
  if ((window as any).YT && (window as any).YT.Player) {
    return Promise.resolve((window as any).YT);
  }
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve((window as any).YT);
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return ytApiPromise;
};

// ============== YouTube player sub-component ==============
const YouTubePlayerInner = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
  videoUrl, thumbnail, onPrevious, onNext, hasPrevious = true, hasNext = true,
  contentId, onVideoComplete, onPlayStateChange, onVideoWatched,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const elementIdRef = useRef(`yt-${Math.random().toString(36).slice(2, 10)}`);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem("videoMuted");
    return saved ? JSON.parse(saved) : false;
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("videoVolume");
    return saved ? parseFloat(saved) : 1;
  });
  const [isInView, setIsInView] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const manualPauseRef = useRef(false);
  const hasWatchedRef = useRef(false);
  const videoId = extractYouTubeId(videoUrl);

  useImperativeHandle(ref, () => ({
    pause: () => { try { playerRef.current?.pauseVideo?.(); } catch {} setIsPlaying(false); },
    play: () => { try { playerRef.current?.playVideo?.(); } catch {} },
    setMuted: (m: boolean) => {
      try {
        if (m) playerRef.current?.mute?.(); else playerRef.current?.unMute?.();
      } catch {}
      setIsMuted(m);
      localStorage.setItem("videoMuted", JSON.stringify(m));
    },
    setVolume: (v: number) => {
      const vol = Math.max(0, Math.min(1, v));
      try { playerRef.current?.setVolume?.(vol * 100); } catch {}
      setVolume(vol);
      localStorage.setItem("videoVolume", vol.toString());
      if (vol === 0) {
        try { playerRef.current?.mute?.(); } catch {}
        setIsMuted(true);
      } else if (isMuted) {
        try { playerRef.current?.unMute?.(); } catch {}
        setIsMuted(false);
      }
    },
    isPlaying,
  }));

  // intersection
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setIsInView(e.isIntersecting && e.intersectionRatio > 0.5),
      { threshold: [0.5, 0.75, 1] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // init player
  useEffect(() => {
    if (!videoId) return;
    let destroyed = false;
    loadYouTubeAPI().then((YT) => {
      if (destroyed || !iframeContainerRef.current) return;
      // create the placeholder div for YT
      const placeholder = document.createElement("div");
      placeholder.id = elementIdRef.current;
      iframeContainerRef.current.innerHTML = "";
      iframeContainerRef.current.appendChild(placeholder);

      playerRef.current = new YT.Player(elementIdRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          loop: 1,
          playlist: videoId,
          enablejsapi: 1,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 1,
        },
        events: {
          onReady: (e: any) => {
            try {
              e.target.setVolume(volume * 100);
              if (isMuted) e.target.mute(); else e.target.unMute();
              setDuration(e.target.getDuration?.() || 0);
              setIsBuffering(false);
            } catch {}
          },
          onStateChange: (e: any) => {
            const state = e.data;
            // 1=playing, 2=paused, 0=ended, 3=buffering
            if (state === 1) {
              setIsPlaying(true);
              setIsBuffering(false);
              onPlayStateChange?.(true);
            } else if (state === 2) {
              setIsPlaying(false);
              onPlayStateChange?.(false);
            } else if (state === 0) {
              setIsPlaying(false);
              onPlayStateChange?.(false);
              if (!hasWatchedRef.current) {
                hasWatchedRef.current = true;
                onVideoWatched?.();
              }
              onVideoComplete?.();
            } else if (state === 3) {
              setIsBuffering(true);
            }
          },
        },
      });
    });
    return () => {
      destroyed = true;
      try { playerRef.current?.destroy?.(); } catch {}
      playerRef.current = null;
    };
  }, [videoId]);

  // poll currentTime
  useEffect(() => {
    const id = window.setInterval(() => {
      try {
        const p = playerRef.current;
        if (!p?.getCurrentTime) return;
        const t = p.getCurrentTime();
        const d = p.getDuration();
        setCurrentTime(t);
        if (d) {
          setDuration(d);
          if (t / d >= 0.95 && !hasWatchedRef.current) {
            hasWatchedRef.current = true;
            onVideoWatched?.();
          }
        }
      } catch {}
    }, 500);
    return () => clearInterval(id);
  }, [onVideoWatched]);

  // autoplay in view
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    if (isInView) {
      if (!manualPauseRef.current) {
        try { p.playVideo?.(); } catch {}
      }
    } else {
      try { p.pauseVideo?.(); } catch {}
      manualPauseRef.current = false;
    }
  }, [isInView]);

  // fullscreen tracking
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) {
      try { p.pauseVideo(); } catch {}
      manualPauseRef.current = true;
    } else {
      setIsBuffering(true);
      try { p.playVideo(); } catch {}
      manualPauseRef.current = false;
    }
  };

  const toggleMute = () => {
    const p = playerRef.current;
    const m = !isMuted;
    try { if (m) p?.mute?.(); else p?.unMute?.(); } catch {}
    setIsMuted(m);
    localStorage.setItem("videoMuted", JSON.stringify(m));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    try { playerRef.current?.setVolume?.(v * 100); } catch {}
    setVolume(v);
    localStorage.setItem("videoVolume", v.toString());
    if (v === 0) setIsMuted(true);
    else if (isMuted) {
      try { playerRef.current?.unMute?.(); } catch {}
      setIsMuted(false);
    }
  };

  const toggleFullscreen = async () => {
    const c = containerRef.current;
    if (!c) return;
    try {
      if (!document.fullscreenElement) await c.requestFullscreen();
      else await document.exitFullscreen();
    } catch {}
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = playerRef.current;
    if (!p || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const t = pct * duration;
    try { p.seekTo(t, true); } catch {}
    setCurrentTime(t);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!videoId) {
    return (
      <div className="relative w-full h-[calc(100vh-80px)] flex items-center justify-center bg-black text-white">
        URL de YouTube no válida
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-[calc(100vh-80px)] flex items-center justify-center bg-black" data-content-id={contentId}>
      {/* iframe wrapper - cover full area */}
      <div className="absolute inset-0 w-full h-full">
        <div ref={iframeContainerRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:absolute [&>iframe]:inset-0 pointer-events-none" />
      </div>
      {/* click overlay for play/pause */}
      <div className="absolute inset-0 z-[5] cursor-pointer" onClick={togglePlay} />

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-opacity duration-300 ${isPlaying || isBuffering ? "opacity-0" : "opacity-100"}`}>
        <div className="w-20 h-20 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
          <Play className="w-10 h-10 text-black ml-1" />
        </div>
      </div>

      <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 flex-col gap-3">
        {hasPrevious && onPrevious && (
          <button onClick={onPrevious} className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform hover:bg-white shadow-lg">
            <ChevronUp className="w-6 h-6 text-black" />
          </button>
        )}
        {hasNext && onNext && (
          <button onClick={onNext} className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform hover:bg-white shadow-lg">
            <ChevronDown className="w-6 h-6 text-black" />
          </button>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30">
        <div className={`bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isPlaying ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-white text-xs font-medium min-w-[35px]">{formatTime(currentTime)}</span>
            <div className="flex-1 h-1 bg-white/30 rounded-full cursor-pointer group" onClick={handleProgressClick}>
              <div className="h-full bg-primary rounded-full transition-all relative group-hover:h-1.5" style={{ width: `${progress}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <span className="text-white text-xs font-medium min-w-[35px]">{formatTime(duration)}</span>
          </div>
        </div>
        <div className={`h-[3px] bg-white/20 transition-opacity duration-300 ${isPlaying ? "opacity-100" : "opacity-0"}`}>
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className={`absolute top-4 right-4 z-30 transition-opacity duration-300 ${isPlaying ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <button onClick={toggleFullscreen} className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors">
          {isFullscreen ? <Minimize className="w-5 h-5 text-white" /> : <Maximize className="w-5 h-5 text-white" />}
        </button>
      </div>
    </div>
  );
});
YouTubePlayerInner.displayName = "YouTubePlayerInner";

// ============== Native HTML5 player (original) ==============
const NativeVideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
  videoUrl, 
  thumbnail,
  onPrevious,
  onNext,
  hasPrevious = true,
  hasNext = true,
  contentId,
  onVideoComplete,
  onPlayStateChange,
  onVideoWatched
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('videoMuted');
    return saved ? JSON.parse(saved) : false;
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('videoVolume');
    return saved ? parseFloat(saved) : 1;
  });
  const [isVertical, setIsVertical] = useState(true);
  const hasWatchedRef = useRef(false);
  const [isInView, setIsInView] = useState(false);
  const manualPauseRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);

useImperativeHandle(ref, () => ({
    pause: () => {
      const video = videoRef.current;
      if (video) {
        video.pause();
        setIsPlaying(false);
      }
    },
    play: () => {
      const video = videoRef.current;
      if (video) {
        video.play().catch(() => {});
        setIsPlaying(true);
      }
    },
    setMuted: (muted: boolean) => {
      const video = videoRef.current;
      if (video) {
        video.muted = muted;
        setIsMuted(muted);
        localStorage.setItem('videoMuted', JSON.stringify(muted));
      }
    },
    setVolume: (v: number) => {
      const video = videoRef.current;
      if (video) {
        const vol = Math.max(0, Math.min(1, v));
        video.volume = vol;
        setVolume(vol);
        localStorage.setItem('videoVolume', vol.toString());
        if (vol === 0) {
          video.muted = true;
          setIsMuted(true);
          localStorage.setItem('videoMuted', JSON.stringify(true));
        } else if (isMuted) {
          video.muted = false;
          setIsMuted(false);
          localStorage.setItem('videoMuted', JSON.stringify(false));
        }
      }
    },
    isPlaying
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting && entry.intersectionRatio > 0.5),
      { threshold: [0.5, 0.75, 1] }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isInView) {
      if (!manualPauseRef.current) {
        video.play().then(() => {
          setIsPlaying(true);
          onPlayStateChange?.(true);
        }).catch(() => setIsPlaying(false));
      }
    } else {
      video.pause();
      setIsPlaying(false);
      onPlayStateChange?.(false);
      manualPauseRef.current = false;
    }
  }, [isInView, onPlayStateChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const aspectRatio = video.videoWidth / video.videoHeight;
      setIsVertical(aspectRatio < 1);
      setDuration(video.duration);
      video.volume = volume;
      video.muted = isMuted;
    };
    const handleVideoEnded = () => {
      if (onVideoComplete) onVideoComplete();
      if (!hasWatchedRef.current && onVideoWatched) {
        hasWatchedRef.current = true;
        onVideoWatched();
      }
    };
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.duration && video.currentTime / video.duration >= 0.95) {
        if (!hasWatchedRef.current && onVideoWatched) {
          hasWatchedRef.current = true;
          onVideoWatched();
        }
      }
    };
    const handleLoadedData = () => {
      video.volume = volume;
      video.muted = isMuted;
      setIsBuffering(false);
    };
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handlePlaying = () => setIsBuffering(false);

    if (video.readyState >= 2) {
      video.volume = volume;
      video.muted = isMuted;
      setIsBuffering(false);
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('ended', handleVideoEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('ended', handleVideoEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [videoUrl, onVideoComplete, onVideoWatched, volume, isMuted]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      manualPauseRef.current = true;
      onPlayStateChange?.(false);
    } else {
      setIsBuffering(true);
      video.play().then(() => {
        setIsPlaying(true);
        manualPauseRef.current = false;
        onPlayStateChange?.(true);
      }).catch(() => {
        setIsPlaying(false);
        setIsBuffering(false);
      });
    }
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;
    try {
      if (!document.fullscreenElement) {
        if (container.requestFullscreen) await container.requestFullscreen();
        else if ((video as any)?.webkitEnterFullscreen) (video as any).webkitEnterFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      if (video && (video as any).webkitEnterFullscreen) {
        try { (video as any).webkitEnterFullscreen(); } catch (e) { console.error(e); }
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    const newTime = percentage * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div ref={containerRef} className="relative w-full h-[calc(100vh-80px)] flex items-center justify-center bg-black" data-content-id={contentId}>
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnail}
        data-content-id={contentId}
        preload="auto"
        className={`${isVertical ? 'w-auto h-full max-w-full object-contain' : 'w-full h-auto max-h-full object-contain'} transition-all`}
        loop
        playsInline
        onClick={togglePlay}
      />

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-opacity duration-300 ${isPlaying || isBuffering ? 'opacity-0' : 'opacity-100'}`}>
        <div className="w-20 h-20 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
          <Play className="w-10 h-10 text-black ml-1" />
        </div>
      </div>

      <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 flex-col gap-3">
        {hasPrevious && onPrevious && (
          <button onClick={onPrevious} className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform hover:bg-white shadow-lg">
            <ChevronUp className="w-6 h-6 text-black" />
          </button>
        )}
        {hasNext && onNext && (
          <button onClick={onNext} className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform hover:bg-white shadow-lg">
            <ChevronDown className="w-6 h-6 text-black" />
          </button>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30">
        <div className={`bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-white text-xs font-medium min-w-[35px]">{formatTime(currentTime)}</span>
            <div className="flex-1 h-1 bg-white/30 rounded-full cursor-pointer group" onClick={handleProgressClick}>
              <div className="h-full bg-primary rounded-full transition-all relative group-hover:h-1.5" style={{ width: `${progress}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <span className="text-white text-xs font-medium min-w-[35px]">{formatTime(duration)}</span>
          </div>
        </div>
        <div className={`h-[3px] bg-white/20 transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0'}`}>
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className={`absolute top-4 right-4 z-30 transition-opacity duration-300 ${isPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <button onClick={toggleFullscreen} className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors">
          {isFullscreen ? <Minimize className="w-5 h-5 text-white" /> : <Maximize className="w-5 h-5 text-white" />}
        </button>
      </div>
    </div>
  );
});
NativeVideoPlayer.displayName = "NativeVideoPlayer";

// ============== TikTok player sub-component ==============
const TikTokPlayerInner = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
  videoUrl, onPrevious, onNext, hasPrevious = true, hasNext = true,
  contentId, onPlayStateChange, onVideoWatched,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hasWatchedRef = useRef(false);
  const watchedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const embedUrl = getTikTokEmbedUrl(videoUrl);

  useImperativeHandle(ref, () => ({
    pause: () => { onPlayStateChange?.(false); },
    play: () => { onPlayStateChange?.(true); },
    setMuted: () => {},
    setVolume: () => {},
    isPlaying: isInView,
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setIsInView(e.isIntersecting && e.intersectionRatio > 0.5),
      { threshold: [0.5, 0.75, 1] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    onPlayStateChange?.(isInView);
    if (isInView && !hasWatchedRef.current) {
      // mark as watched after 10s in view
      watchedTimerRef.current = setTimeout(() => {
        if (!hasWatchedRef.current) {
          hasWatchedRef.current = true;
          onVideoWatched?.();
        }
      }, 10000);
    } else if (!isInView && watchedTimerRef.current) {
      clearTimeout(watchedTimerRef.current);
      watchedTimerRef.current = null;
    }
    return () => {
      if (watchedTimerRef.current) clearTimeout(watchedTimerRef.current);
    };
  }, [isInView, onPlayStateChange, onVideoWatched]);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  const toggleFullscreen = async () => {
    const c = containerRef.current;
    if (!c) return;
    try {
      if (!document.fullscreenElement) await c.requestFullscreen();
      else await document.exitFullscreen();
    } catch {}
  };

  if (!embedUrl) {
    return (
      <div className="relative w-full h-[calc(100vh-80px)] flex items-center justify-center bg-black text-white px-6 text-center">
        <div>
          <p className="mb-2">No se pudo cargar el video de TikTok.</p>
          <a href={videoUrl} target="_blank" rel="noreferrer" className="text-primary underline">Abrir en TikTok</a>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-[calc(100vh-80px)] flex items-center justify-center bg-black overflow-hidden" data-content-id={contentId}>
      {isInView ? (
        <div className="absolute inset-0 overflow-hidden">
          <iframe
            key={embedUrl}
            src={embedUrl}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            title="TikTok video"
            style={{
              position: "absolute",
              top: "-12%",
              left: "-30%",
              width: "160%",
              height: "130%",
              border: 0,
            }}
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 flex-col gap-3">
        {hasPrevious && onPrevious && (
          <button onClick={onPrevious} className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform hover:bg-white shadow-lg">
            <ChevronUp className="w-6 h-6 text-black" />
          </button>
        )}
        {hasNext && onNext && (
          <button onClick={onNext} className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform hover:bg-white shadow-lg">
            <ChevronDown className="w-6 h-6 text-black" />
          </button>
        )}
      </div>

      <div className="absolute top-4 right-4 z-30">
        <button onClick={toggleFullscreen} className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors">
          {isFullscreen ? <Minimize className="w-5 h-5 text-white" /> : <Maximize className="w-5 h-5 text-white" />}
        </button>
      </div>
    </div>
  );
});
TikTokPlayerInner.displayName = "TikTokPlayerInner";

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>((props, ref) => {
  if (isYouTubeUrl(props.videoUrl)) {
    return <YouTubePlayerInner ref={ref} {...props} />;
  }
  if (isTikTokUrl(props.videoUrl)) {
    return <TikTokPlayerInner ref={ref} {...props} />;
  }
  return <NativeVideoPlayer ref={ref} {...props} />;
});
VideoPlayer.displayName = "VideoPlayer";
