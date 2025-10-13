import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Play, Pause, Volume2, VolumeX, ChevronUp, ChevronDown, Maximize, Minimize } from "lucide-react";

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
  onVideoWatched?: () => void; // Called when video is fully watched
}

export interface VideoPlayerRef {
  pause: () => void;
  play: () => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  isPlaying: boolean;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
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
        video.play().catch(() => {
          // Ignore autoplay errors
        });
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

  // IntersectionObserver to detect when video is in view
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting && entry.intersectionRatio > 0.5);
      },
      { threshold: [0.5, 0.75, 1] }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Auto-play when video comes into view
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isInView) {
      // Only auto-play if user hasn't manually paused
      if (!manualPauseRef.current) {
        video.play().then(() => {
          setIsPlaying(true);
          onPlayStateChange?.(true);
        }).catch(() => {
          setIsPlaying(false);
        });
      }
    } else {
      video.pause();
      setIsPlaying(false);
      onPlayStateChange?.(false);
      // Reset manual pause when video goes out of view
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
      // Apply saved volume and mute settings after metadata loads
      video.volume = volume;
      video.muted = isMuted;
    };

    const handleVideoEnded = () => {
      if (onVideoComplete) {
        onVideoComplete();
      }
      // Mark as watched when video ends
      if (!hasWatchedRef.current && onVideoWatched) {
        hasWatchedRef.current = true;
        onVideoWatched();
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Mark as watched when 95% of video is played
      if (video.duration && video.currentTime / video.duration >= 0.95) {
        if (!hasWatchedRef.current && onVideoWatched) {
          hasWatchedRef.current = true;
          onVideoWatched();
        }
      }
    };

    const handleLoadedData = () => {
      // Ensure volume settings persist after data loads
      video.volume = volume;
      video.muted = isMuted;
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    // Apply settings immediately if video is already loaded
    if (video.readyState >= 2) {
      video.volume = volume;
      video.muted = isMuted;
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('ended', handleVideoEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('ended', handleVideoEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [videoUrl, onVideoComplete, onVideoWatched, volume, isMuted]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    const newPlayingState = !isPlaying;
    if (newPlayingState) {
      video.play();
      manualPauseRef.current = false;
    } else {
      video.pause();
      manualPauseRef.current = true;
    }
    setIsPlaying(newPlayingState);
    onPlayStateChange?.(newPlayingState);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    const newMutedState = !isMuted;
    video.muted = newMutedState;
    setIsMuted(newMutedState);
    localStorage.setItem('videoMuted', JSON.stringify(newMutedState));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    localStorage.setItem('videoVolume', newVolume.toString());
    
    if (newVolume === 0) {
      const newMutedState = true;
      setIsMuted(newMutedState);
      localStorage.setItem('videoMuted', JSON.stringify(newMutedState));
    } else if (isMuted) {
      const newMutedState = false;
      setIsMuted(newMutedState);
      localStorage.setItem('videoMuted', JSON.stringify(newMutedState));
    }
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
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
        className={`${
          isVertical 
            ? 'w-auto h-full max-w-full object-contain' 
            : 'w-full h-auto max-h-full object-contain'
        } transition-all`}
        loop
        playsInline
        onClick={togglePlay}
      />

      {/* Play/Pause overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        style={{ opacity: isPlaying ? 0 : 1, transition: 'opacity 0.3s' }}
      >
        <div className="w-20 h-20 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
          <Play className="w-10 h-10 text-black ml-1" />
        </div>
      </div>

      {/* Vertical navigation buttons - hidden on mobile */}
      <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 flex-col gap-3">
        {hasPrevious && onPrevious && (
          <button
            onClick={onPrevious}
            className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform hover:bg-white shadow-lg"
          >
            <ChevronUp className="w-6 h-6 text-black" />
          </button>
        )}
        {hasNext && onNext && (
          <button
            onClick={onNext}
            className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform hover:bg-white shadow-lg"
          >
            <ChevronDown className="w-6 h-6 text-black" />
          </button>
        )}
      </div>

      {/* Progress bar - just above bottom nav on mobile, at bottom on desktop */}
      <div className="absolute bottom-[80px] md:bottom-0 left-0 right-0 z-30 md:bg-black/80 md:backdrop-blur-sm">
        <div className="flex items-center gap-2 px-2 py-0.5 md:px-3 md:py-2">
          <span className="text-white text-xs font-medium min-w-[35px]">{formatTime(currentTime)}</span>
          <div 
            className="flex-1 h-1 bg-white/30 rounded-full cursor-pointer group"
            onClick={handleProgressClick}
          >
            <div 
              className="h-full bg-primary rounded-full transition-all relative group-hover:h-1.5"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <span className="text-white text-xs font-medium min-w-[35px]">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Fullscreen button - top right corner */}
      <div className="absolute top-4 right-4 z-30">
        <button
          onClick={toggleFullscreen}
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
        >
          {isFullscreen ? (
            <Minimize className="w-5 h-5 text-white" />
          ) : (
            <Maximize className="w-5 h-5 text-white" />
          )}
        </button>
      </div>
    </div>
  );
});
