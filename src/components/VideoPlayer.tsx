import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, ChevronUp, ChevronDown } from "lucide-react";

interface VideoPlayerProps {
  videoUrl: string;
  thumbnail?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export const VideoPlayer = ({ 
  videoUrl, 
  thumbnail,
  onPrevious,
  onNext,
  hasPrevious = true,
  hasNext = true
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isVertical, setIsVertical] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const aspectRatio = video.videoWidth / video.videoHeight;
      setIsVertical(aspectRatio < 1);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [videoUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
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
    <div className="relative w-full h-full flex items-center justify-center bg-background">
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnail}
        className={`${
          isVertical 
            ? 'w-full h-full object-cover' 
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
        <div className="w-20 h-20 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <Play className="w-10 h-10 text-foreground ml-1" />
        </div>
      </div>

      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className="absolute bottom-24 left-4 z-20 w-12 h-12 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform"
      >
        {isPlaying ? (
          <Pause className="w-6 h-6 text-foreground" />
        ) : (
          <Play className="w-6 h-6 text-foreground ml-0.5" />
        )}
      </button>

      {/* Volume controls */}
      <div className="absolute bottom-24 left-20 z-20 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-full px-3 py-2">
        <button
          onClick={toggleMute}
          className="hover:scale-110 transition-transform"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-5 h-5 text-foreground" />
          ) : (
            <Volume2 className="w-5 h-5 text-foreground" />
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-20 h-1 bg-muted rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
        />
      </div>

      {/* Vertical navigation buttons */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
        {hasPrevious && onPrevious && (
          <button
            onClick={onPrevious}
            className="w-12 h-12 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform hover:bg-primary/20"
          >
            <ChevronUp className="w-6 h-6 text-foreground" />
          </button>
        )}
        {hasNext && onNext && (
          <button
            onClick={onNext}
            className="w-12 h-12 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform hover:bg-primary/20"
          >
            <ChevronDown className="w-6 h-6 text-foreground" />
          </button>
        )}
      </div>
    </div>
  );
};
