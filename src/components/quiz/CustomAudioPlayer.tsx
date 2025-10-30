import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CustomAudioPlayerProps {
  audioUrl: string;
  title?: string;
  avatarUrl?: string;
}

export const CustomAudioPlayer = ({ audioUrl, title = "Audio de la pregunta", avatarUrl }: CustomAudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Generate animated waveform bars based on playback
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bars = Array.from({ length: 40 }, (_, i) => {
    const height = Math.random() * 60 + 20;
    const isActive = (i / 40) * 100 <= progress;
    return (
      <div
        key={i}
        className={`w-1 rounded-full transition-all duration-150 ${
          isPlaying && isActive
            ? "bg-primary animate-pulse"
            : isActive
            ? "bg-primary/70"
            : "bg-muted-foreground/30"
        }`}
        style={{
          height: `${height}%`,
          animationDelay: `${i * 20}ms`,
        }}
      />
    );
  });

  return (
    <div className="w-full bg-card border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
      <audio ref={audioRef} src={audioUrl} />
      
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback className="bg-primary/10">
          <Volume2 className="h-5 w-5 text-primary" />
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium truncate">{title}</p>
        <div className="h-8 flex items-center gap-0.5">
          {bars}
        </div>
      </div>

      <Button
        onClick={togglePlay}
        size="icon"
        className="h-12 w-12 rounded-full flex-shrink-0"
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" />
        )}
      </Button>
    </div>
  );
};
