import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Play, Pause, Volume2, VolumeX, ChevronUp, ChevronDown } from "lucide-react";

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isVertical, setIsVertical] = useState(true);
  const hasWatchedRef = useRef(false);

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
    isPlaying
  }));

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const aspectRatio = video.videoWidth / video.videoHeight;
      setIsVertical(aspectRatio < 1);
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
      // Mark as watched when 95% of video is played
      if (video.duration && video.currentTime / video.duration >= 0.95) {
        if (!hasWatchedRef.current && onVideoWatched) {
          hasWatchedRef.current = true;
          onVideoWatched();
        }
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleVideoEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleVideoEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoUrl, onVideoComplete, onVideoWatched]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    const newPlayingState = !isPlaying;
    if (newPlayingState) {
      video.play();
    } else {
      video.pause();
    }
    setIsPlaying(newPlayingState);
    onPlayStateChange?.(newPlayingState);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-80px)] flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnail}
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

      {/* Volume control - positioned at bottom left */}
      <div className="absolute bottom-8 left-8 z-20 flex items-center gap-3">
        <button
          onClick={toggleMute}
          className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform hover:bg-white shadow-lg"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-6 h-6 text-black" />
          ) : (
            <Volume2 className="w-6 h-6 text-black" />
          )}
        </button>
        
        {/* Volume slider */}
        <div className="relative w-24 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center px-4">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full h-1 appearance-none bg-gray-300 rounded-full cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-black
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-md
              [&::-moz-range-thumb]:w-4
              [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-black
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer
              [&::-moz-range-thumb]:shadow-md"
          />
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
    </div>
  );
});
