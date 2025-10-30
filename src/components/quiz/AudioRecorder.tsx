import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Upload, X, Play, Pause } from "lucide-react";
import { useCloudinary } from "@/hooks/useCloudinary";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

interface AudioRecorderProps {
  value?: string;
  onChange: (url: string) => void;
  onClose?: () => void;
}

export const AudioRecorder = ({ value, onChange, onClose }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { uploadFile, uploading } = useCloudinary();
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo acceder al micrófono",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playAudio = () => {
    if (!audioBlob && !value) return;

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        const url = audioBlob ? URL.createObjectURL(audioBlob) : value;
        audioRef.current.src = url || "";
        audioRef.current.play();
        setIsPlaying(true);
        audioRef.current.onended = () => setIsPlaying(false);
      }
    }
  };

  const uploadAudio = async () => {
    if (!audioBlob) return;

    try {
      const file = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
      const url = await uploadFile(file, "raw");
      
      if (url) {
        onChange(url);
        toast({
          title: "Audio subido",
          description: "El audio se ha guardado correctamente",
        });
        setAudioBlob(null);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo subir el audio",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo de audio",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = await uploadFile(file, "raw");
      if (url) {
        onChange(url);
        toast({
          title: "Audio subido",
          description: "El audio se ha guardado correctamente",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo subir el audio",
        variant: "destructive",
      });
    }
  };

  const removeAudio = () => {
    onChange("");
    setAudioBlob(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setIsPlaying(false);
  };

  return (
    <div className="space-y-3 p-3 bg-muted rounded-lg">
      <audio ref={audioRef} className="hidden" />
      
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Audio</span>
        {onClose && (
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {(value || audioBlob) ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={playAudio}
              disabled={uploading}
            >
              {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {isPlaying ? "Pausar" : "Reproducir"}
            </Button>
            
            {audioBlob && !value && (
              <Button
                type="button"
                size="sm"
                onClick={uploadAudio}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-1" />
                {uploading ? "Subiendo..." : "Guardar"}
              </Button>
            )}
            
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={removeAudio}
              disabled={uploading}
            >
              <X className="h-4 w-4 mr-1" />
              Eliminar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={isRecording ? "destructive" : "outline"}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? (
                <>
                  <Square className="h-4 w-4 mr-1" />
                  Detener
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-1" />
                  Grabar
                </>
              )}
            </Button>

            <div className="relative">
              <Input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
                id="audio-upload"
                disabled={uploading}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => document.getElementById('audio-upload')?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-1" />
                Subir archivo
              </Button>
            </div>
          </div>
          
          {isRecording && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Grabando...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
