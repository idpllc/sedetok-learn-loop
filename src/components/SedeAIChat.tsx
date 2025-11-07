import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Send, Loader2, MessageSquare, Trash2, Plus, ArrowLeft, Menu, Paperclip, Mic, Square, X, Image as ImageIcon, AudioLines } from "lucide-react";
import { useSedeAIChat } from "@/hooks/useSedeAIChat";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCloudinary } from "@/hooks/useCloudinary";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PathData {
  id: string;
  title: string;
  description: string;
  category?: string;
  subject?: string;
  creator?: string;
  cover_url?: string;
}

interface ContentData {
  id: string;
  title: string;
  description: string;
  category?: string;
  subject?: string;
  creator?: string;
  cover_url?: string;
  type: 'video' | 'quiz' | 'game' | 'reading';
}

const ContentCards = ({ content }: { content: ContentData[] }) => {
  const navigate = useNavigate();
  
  const getContentRoute = (item: ContentData) => {
    // Determinar la ruta basada en el tipo de contenido
    if (item.type === 'quiz') {
      return `/?quiz=${item.id}`;
    } else if (item.type === 'game') {
      return `/?game=${item.id}`;
    } else {
      return `/?content=${item.id}`;
    }
  };

  const getContentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      video: '📹 Video',
      quiz: '📝 Quiz',
      game: '🎮 Juego',
      reading: '📖 Lectura'
    };
    return labels[type] || type;
  };
  
  return (
    <div className="mt-4 w-full">
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {content.map((item) => (
            <CarouselItem key={item.id} className="pl-2 basis-[280px]">
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden h-full"
                onClick={() => navigate(getContentRoute(item))}
              >
                {item.cover_url && (
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img
                      src={item.cover_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-primary">
                      {getContentTypeLabel(item.type)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">{item.title}</h3>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {item.description}
                    </p>
                  )}
                  <div className="flex gap-1 flex-wrap">
                    {item.category && (
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                        {item.category}
                      </span>
                    )}
                    {item.subject && (
                      <span className="text-xs px-2 py-0.5 bg-secondary/10 text-secondary-foreground rounded-full">
                        {item.subject}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </div>
  );
};

const PathCards = ({ paths }: { paths: PathData[] }) => {
  const navigate = useNavigate();
  
  return (
    <div className="mt-4 w-full">
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {paths.map((path) => (
            <CarouselItem key={path.id} className="pl-2 basis-[280px]">
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden h-full"
                onClick={() => navigate(`/learning-paths/${path.id}`)}
              >
                {path.cover_url && (
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img
                      src={path.cover_url}
                      alt={path.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">{path.title}</h3>
                  {path.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {path.description}
                    </p>
                  )}
                  <div className="flex gap-1 flex-wrap">
                    {path.category && (
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                        {path.category}
                      </span>
                    )}
                    {path.subject && (
                      <span className="text-xs px-2 py-0.5 bg-secondary/10 text-secondary-foreground rounded-full">
                        {path.subject}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </div>
  );
};

export const SedeAIChat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    conversations,
    messages,
    isLoading,
    isStreaming,
    currentConversationId,
    sendMessage,
    selectConversation,
    deleteConversation,
    shouldRespondWithVoice,
    setShouldRespondWithVoice,
    voiceMode,
    setVoiceMode,
  } = useSedeAIChat();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<Array<{type: 'image' | 'audio' | 'file', url: string, name: string}>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const { uploadFile, uploading } = useCloudinary();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Play AI response with voice when shouldRespondWithVoice is true
  useEffect(() => {
    const playAudioResponse = async () => {
      if (!shouldRespondWithVoice || messages.length === 0) return;
      
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role !== 'assistant' || isStreaming) return;

      // Extract text content (remove special markers)
      let textContent = lastMessage.content;
      textContent = textContent.replace(/\|\|\|PATHS_DATA:.*?\|\|\|/g, '').trim();
      textContent = textContent.replace(/\|\|\|CONTENT_DATA:.*?\|\|\|/g, '').trim();

      if (!textContent) return;

      try {
        console.log('Generating speech for response...');
        
        const { data, error } = await supabase.functions.invoke('text-to-speech', {
          body: { text: textContent }
        });

        if (error || !data?.audioContent) {
          console.error('Error generating speech:', error);
          return;
        }

        // Convert base64 to audio and play
        const binaryString = atob(data.audioContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioPlayerRef.current) {
          audioPlayerRef.current.src = audioUrl;
          await audioPlayerRef.current.play();
        }

        // Reset flag after playing
        setShouldRespondWithVoice(false);
      } catch (error) {
        console.error('Error playing audio response:', error);
        setShouldRespondWithVoice(false);
      }
    };

    playAudioResponse();
  }, [messages, shouldRespondWithVoice, isStreaming, setShouldRespondWithVoice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const message = input || "Ver adjuntos";
    const attToSend = [...attachments];
    setInput("");
    setAttachments([]);
    await sendMessage(message, attToSend, false);
  };

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

  const handleAudioSubmit = async () => {
    if (!audioBlob) return;

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        if (!base64Audio) {
          toast({
            title: "Error",
            description: "No se pudo procesar el audio",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Transcribiendo audio...",
          description: "Por favor espera",
        });

        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Audio }
        });

        if (error || !data?.text) {
          toast({
            title: "Error",
            description: "No se pudo transcribir el audio",
            variant: "destructive",
          });
          return;
        }

        // Send message directly with voice response flag
        await sendMessage(data.text, [], true);
        setAudioBlob(null);
        
        toast({
          title: "Audio enviado",
          description: "La respuesta será en audio",
        });
      };
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar el audio",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        let resourceType: "image" | "video" | "raw" = "raw";
        let attachmentType: 'image' | 'audio' | 'file' = 'file';
        
        if (file.type.startsWith('image/')) {
          resourceType = "image";
          attachmentType = 'image';
        } else if (file.type.startsWith('audio/')) {
          resourceType = "raw";
          attachmentType = 'audio';
        }

        const url = await uploadFile(file, resourceType);
        
        if (url) {
          setAttachments(prev => [...prev, { 
            type: attachmentType, 
            url, 
            name: file.name 
          }]);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: `No se pudo subir ${file.name}`,
          variant: "destructive",
        });
      }
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleNewChat = () => {
    selectConversation(null);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const handleSelectConversation = (id: string) => {
    selectConversation(id);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const ConversationsList = () => (
    <>
      <div className="p-4 border-b bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">SEDE AI</h2>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewChat}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva conversación
        </Button>
      </div>

      <ScrollArea className="h-[calc(100%-8rem)]">
        <div className="p-4 space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No hay conversaciones aún.
              <br />
              ¡Inicia una nueva!
            </div>
          ) : (
            conversations.map((conv, index) => (
              <div
                key={conv.id}
                className="relative"
                style={{ zIndex: conversations.length - index }}
              >
                <Card
                  className={cn(
                    "p-3 cursor-pointer hover:bg-accent transition-colors group relative overflow-visible",
                    currentConversationId === conv.id && "bg-accent border-primary"
                  )}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug line-clamp-2">
                        {conv.title || "Nueva conversación"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(conv.updated_at).toLocaleDateString("es", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                        {String(((conv as any)?.last_message?.content) || (conv as any)?.last_message || (conv as any)?.preview || "").slice(0, 60)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("¿Eliminar esta conversación?")) {
                          deleteConversation(conv.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </Card>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Hidden audio player for voice responses */}
      <audio ref={audioPlayerRef} className="hidden" />
      
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="w-80 border-r bg-card">
          <ConversationsList />
        </div>
      )}

      {/* Mobile Sheet */}
      {isMobile && (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-80">
            <ConversationsList />
          </SheetContent>
        </Sheet>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-0">
        {/* Header */}
        <div className="p-4 border-b bg-card flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                className="flex-shrink-0"
              >
                <Menu className="w-5 h-5" />
              </Button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">SEDE AI</h1>
                <p className="text-xs text-muted-foreground">
                  Tu asistente educativo inteligente
                </p>
              </div>
            </div>
          </div>
          
          {/* Voice Mode Toggle */}
          <Button
            variant={voiceMode ? "default" : "outline"}
            size="sm"
            onClick={() => setVoiceMode(!voiceMode)}
            className="flex items-center gap-2"
          >
            {voiceMode ? (
              <>
                <AudioLines className="w-4 h-4" />
                <span className="hidden sm:inline">Modo Voz</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Modo Texto</span>
              </>
            )}
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2">¡Hola! Soy SEDE AI</h2>
                <p className="text-muted-foreground mb-6">
                  Estoy aquí para ayudarte con tus estudios, sugerirte rutas de
                  aprendizaje y más.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  <Card
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() =>
                      sendMessage("¿Qué rutas de aprendizaje me recomiendas?")
                    }
                  >
                    <p className="text-sm font-medium">
                      ¿Qué rutas me recomiendas?
                    </p>
                  </Card>
                  <Card
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => sendMessage("Analiza mi progreso académico")}
                  >
                    <p className="text-sm font-medium">
                      Analiza mi progreso
                    </p>
                  </Card>
                  <Card
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() =>
                      sendMessage("¿Qué cursos debo tomar para mejorar?")
                    }
                  >
                    <p className="text-sm font-medium">
                      ¿Qué cursos me ayudarían?
                    </p>
                  </Card>
                  <Card
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() =>
                      sendMessage("Dame consejos para mi desarrollo profesional")
                    }
                  >
                    <p className="text-sm font-medium">
                      Consejos profesionales
                    </p>
                  </Card>
                </div>
              </div>
            ) : (
              messages.map((message, idx) => {
                // Check if message contains path or content data
                const pathsMatch = message.content.match(/\|\|\|PATHS_DATA:(.*?)\|\|\|/);
                const contentMatch = message.content.match(/\|\|\|CONTENT_DATA:(.*?)\|\|\|/);
                let messageContent = message.content;
                let pathsData: PathData[] = [];
                let contentData: ContentData[] = [];

                if (pathsMatch) {
                  try {
                    pathsData = JSON.parse(pathsMatch[1]);
                    messageContent = message.content.replace(/\|\|\|PATHS_DATA:.*?\|\|\|/, '').trim();
                  } catch (e) {
                    console.error('Error parsing paths data:', e);
                  }
                }

                if (contentMatch) {
                  try {
                    contentData = JSON.parse(contentMatch[1]);
                    messageContent = message.content.replace(/\|\|\|CONTENT_DATA:.*?\|\|\|/, '').trim();
                  } catch (e) {
                    console.error('Error parsing content data:', e);
                  }
                }

                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <Avatar className="w-8 h-8 mt-1">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600">
                          <Sparkles className="w-4 h-4 text-white" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="max-w-[80%]">
                      <Card
                        className={cn(
                          "p-3",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {messageContent}
                        </p>
                      </Card>
                      {pathsData.length > 0 && <PathCards paths={pathsData} />}
                      {contentData.length > 0 && <ContentCards content={contentData} />}
                    </div>
                    {message.role === "user" && (
                      <Avatar className="w-8 h-8 mt-1">
                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                        <AvatarFallback>
                          {user?.user_metadata?.full_name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })
            )}
            {isStreaming && (
              <div className="flex gap-3 justify-start">
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600">
                    <Sparkles className="w-4 h-4 text-white" />
                  </AvatarFallback>
                </Avatar>
                <Card className="p-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </Card>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t bg-card">
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="relative group">
                  <Card className="p-2 pr-8">
                    <div className="flex items-center gap-2">
                      {att.type === 'image' && <ImageIcon className="w-4 h-4" />}
                      {att.type === 'audio' && <Mic className="w-4 h-4" />}
                      {att.type === 'file' && <Paperclip className="w-4 h-4" />}
                      <span className="text-xs">{att.name}</span>
                    </div>
                  </Card>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => removeAttachment(idx)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Audio Recording */}
          {audioBlob && (
            <div className="mb-3">
              <Card className="p-3 flex items-center justify-between">
                <span className="text-sm">Audio grabado</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAudioSubmit} disabled={uploading}>
                    Transcribir
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAudioBlob(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </div>
          )}

          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || uploading}
              >
                <Paperclip className="w-5 h-5" />
              </Button>
              
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading || uploading}
                className={cn(isRecording && "text-destructive")}
              >
                {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu pregunta o solicitud..."
                disabled={isLoading || uploading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || uploading || (!input.trim() && attachments.length === 0)}>
                {isLoading || uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};