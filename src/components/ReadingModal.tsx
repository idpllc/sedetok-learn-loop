import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Square, Loader2, Pause, Play } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { VOICE_AGENTS } from "@/lib/voiceAgents";
import { toast } from "sonner";
import sofiaAvatar from "@/assets/avatars/sofia-avatar.png";
import alejandroAvatar from "@/assets/avatars/alejandro-avatar.png";

const avatarImages: Record<string, string> = {
  sofia: sofiaAvatar,
  alejandro: alejandroAvatar,
};

interface ReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  onReadComplete?: () => void;
}

export const ReadingModal = ({ isOpen, onClose, title, content, onReadComplete }: ReadingModalProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasReadRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      hasReadRef.current = false;
      stopAudio();
    }
  }, [isOpen]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
  }, []);

  const stripHtml = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const handleReadAloud = async (agentId: string) => {
    // If same agent is playing, toggle pause
    if (selectedAgent === agentId && isPlaying) {
      if (isPaused) {
        audioRef.current?.play();
        setIsPaused(false);
      } else {
        audioRef.current?.pause();
        setIsPaused(true);
      }
      return;
    }

    stopAudio();
    setSelectedAgent(agentId);
    setIsGenerating(true);

    const agent = VOICE_AGENTS.find(a => a.id === agentId);
    if (!agent) {
      toast.error('Tutor no encontrado');
      setIsGenerating(false);
      return;
    }

    const plainText = stripHtml(content);
    // Limit to ~5000 chars for TTS API
    const textToRead = plainText.substring(0, 5000);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: textToRead, voice: agent.ttsVoiceId }),
        }
      );

      if (!response.ok) throw new Error('Error generando audio');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(0);
        setSelectedAgent(null);
      });

      await audio.play();
      setIsPlaying(true);
      setIsGenerating(false);
    } catch (error) {
      console.error('TTS error:', error);
      toast.error('Error al generar el audio. Intenta de nuevo.');
      setIsGenerating(false);
      setSelectedAgent(null);
    }
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const scrollPercentage = (target.scrollTop + target.clientHeight) / target.scrollHeight;
    
    if (scrollPercentage >= 0.95 && !hasReadRef.current && onReadComplete) {
      hasReadRef.current = true;
      onReadComplete();
    }
  };

  const handleClose = () => {
    stopAudio();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          
          {/* Voice Selection Bar */}
          <div className="flex items-center gap-3 mt-3">
            <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground flex-shrink-0">Leer con voz:</span>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide min-w-0">
              {VOICE_AGENTS.map((agent) => {
                const isActive = selectedAgent === agent.id;
                const isThisGenerating = isActive && isGenerating;
                return (
                  <Button
                    key={agent.id}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => handleReadAloud(agent.id)}
                    disabled={isGenerating && !isActive}
                  >
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={avatarImages[agent.id]} />
                      <AvatarFallback className="text-[8px]">{agent.name[0]}</AvatarFallback>
                    </Avatar>
                    {agent.name}
                    {isThisGenerating && <Loader2 className="w-3 h-3 animate-spin" />}
                    {isActive && isPlaying && !isGenerating && (
                      isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />
                    )}
                  </Button>
                );
              })}
              {isPlaying && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:text-destructive"
                  onClick={stopAudio}
                >
                  <Square className="w-3 h-3 mr-1" />
                  Detener
                </Button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {isPlaying && (
            <div className="w-full h-1 bg-muted rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6 py-4" onScrollCapture={handleScroll}>
          <div ref={scrollRef} className="prose prose-sm md:prose-base max-w-none">
            <div className="whitespace-pre-wrap leading-relaxed text-foreground">
              {content}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
