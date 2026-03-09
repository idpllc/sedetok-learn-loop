import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Loader2, MessageSquare, Trash2, Plus, ArrowLeft, Menu, Mic, MicOff, Phone, Volume2 } from "lucide-react";
import { useLanguageTutor } from "@/hooks/useLanguageTutor";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useConversation } from "@11labs/react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import alexAvatar from "@/assets/avatars/lingua-avatar.png";
import ReactMarkdown from "react-markdown";

const CEFR_COLORS: Record<string, string> = {
  A1: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  A2: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  B1: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  B2: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  C1: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  C2: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
};

const CEFR_LABELS: Record<string, string> = {
  A1: 'Principiante',
  A2: 'Elemental',
  B1: 'Intermedio',
  B2: 'Intermedio Alto',
  C1: 'Avanzado',
  C2: 'Maestría',
};

export const LanguageTutorChat = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const {
    conversations,
    currentConversationId,
    messages,
    isLoading,
    assessment,
    latestResult,
    sendMessage,
    selectConversation,
    startNewChat,
    deleteConversation,
  } = useLanguageTutor();

  const [inputMessage, setInputMessage] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<Array<{ role: "user" | "agent"; text: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice conversation
  const voiceConversation = useConversation({
    onConnect: () => {
      setVoiceTranscript([]);
    },
    onDisconnect: () => {
      setIsVoiceMode(false);
    },
    onMessage: (message: { message: string; source: string }) => {
      if (message.source === "user") {
        setVoiceTranscript(prev => [...prev, { role: "user", text: message.message }]);
      } else if (message.source === "ai") {
        setVoiceTranscript(prev => [...prev, { role: "agent", text: message.message }]);
      }
    },
    onError: (error) => {
      console.error("Voice error:", error);
      toast.error("Error en la conversación de voz");
      setIsVoiceMode(false);
    },
  });

  const startVoiceMode = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const { data, error } = await supabase.functions.invoke("elevenlabs-signed-url", {
        body: { agent_id: "agent_8401kk8r0436fwkv2shkbzj5m3aj" },
      });
      if (error || !data?.signed_url) throw new Error("No signed URL");
      await voiceConversation.startSession({ signedUrl: data.signed_url });
      setIsVoiceMode(true);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast.error("Necesitas permitir el acceso al micrófono");
      } else {
        toast.error("Error al iniciar modo voz");
      }
    }
  }, [voiceConversation]);

  const stopVoiceMode = useCallback(async () => {
    await voiceConversation.endSession();
    setIsVoiceMode(false);
  }, [voiceConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, voiceTranscript]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;
    const msg = inputMessage;
    setInputMessage("");
    await sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Assessment result card
  const AssessmentCard = () => {
    if (!assessment?.current_level && !latestResult) return null;
    const level = latestResult?.level || assessment?.current_level;
    if (!level) return null;

    return (
      <div className="mx-4 mb-4 p-4 rounded-xl border border-border bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">Tu nivel de inglés</span>
          <Badge className={cn("text-sm font-bold px-3", CEFR_COLORS[level] || 'bg-muted')}>
            {level} - {CEFR_LABELS[level] || level}
          </Badge>
        </div>
        {latestResult?.skill_scores && (
          <div className="space-y-2">
            {latestResult.skill_scores.map((s) => (
              <div key={s.skill} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20 capitalize">{s.skill}</span>
                <Progress value={s.score} className="flex-1 h-2" />
                <Badge variant="outline" className="text-[10px] px-1.5">{s.level}</Badge>
              </div>
            ))}
          </div>
        )}
        {latestResult?.weaknesses && latestResult.weaknesses.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Áreas de mejora:</p>
            <div className="flex flex-wrap gap-1">
              {latestResult.weaknesses.map((w, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">{w}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const ConversationSidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <Button onClick={startNewChat} className="w-full gap-2" variant="outline">
          <Plus className="w-4 h-4" />
          Nueva conversación
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-lg cursor-pointer group transition-colors",
                currentConversationId === conv.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              )}
              onClick={() => {
                selectConversation(conv.id);
                setShowSidebar(false);
              }}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="text-sm truncate flex-1">
                {conv.title?.replace('[ALEX] ', '') || 'Conversación'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex h-[100dvh] bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="w-72 border-r border-border bg-card hidden md:flex flex-col">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={alexAvatar} />
                <AvatarFallback>A</AvatarFallback>
              </Avatar>
              <span className="font-semibold text-foreground">Alex</span>
            </div>
          </div>
          <ConversationSidebar />
        </div>
      )}

      {/* Mobile Sidebar Sheet */}
      <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle>Conversaciones</SheetTitle>
          </SheetHeader>
          <ConversationSidebar />
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setShowSidebar(true)}>
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <Avatar className="w-9 h-9 ring-2 ring-primary/20">
            <AvatarImage src={linguaAvatar} />
            <AvatarFallback>L</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground text-sm">Lingua</h2>
            <p className="text-xs text-muted-foreground truncate">
              {assessment?.current_level
                ? `Nivel: ${assessment.current_level} - ${CEFR_LABELS[assessment.current_level] || ''}`
                : 'Tutora de inglés • Evaluación adaptativa'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {assessment?.current_level && (
              <Badge className={cn("text-xs", CEFR_COLORS[assessment.current_level] || '')}>
                {assessment.current_level}
              </Badge>
            )}
            <Button
              variant={isVoiceMode ? "destructive" : "outline"}
              size="icon"
              onClick={isVoiceMode ? stopVoiceMode : startVoiceMode}
              className="h-8 w-8"
            >
              {isVoiceMode ? <MicOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Voice Mode Overlay */}
        {isVoiceMode && (
          <div className="flex-1 flex flex-col bg-background">
            <ScrollArea className="flex-1 p-4">
              <div className="max-w-2xl mx-auto space-y-3">
                {voiceTranscript.length === 0 && (
                  <div className="flex flex-col items-center justify-center pt-20 gap-4">
                    <div className={cn(
                      "w-24 h-24 rounded-full flex items-center justify-center",
                      voiceConversation.isSpeaking ? "bg-primary/20 animate-pulse" : "bg-accent/20 animate-pulse"
                    )}>
                      {voiceConversation.isSpeaking ? (
                        <Volume2 className="w-10 h-10 text-primary" />
                      ) : (
                        <Mic className="w-10 h-10 text-accent" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {voiceConversation.isSpeaking ? "Lingua está hablando..." : "Habla para comenzar 🎤"}
                    </p>
                  </div>
                )}
                {voiceTranscript.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="px-4 py-3 border-t border-border flex items-center justify-center">
              <Button variant="destructive" onClick={stopVoiceMode} className="gap-2">
                <MicOff className="w-4 h-4" />
                Finalizar conversación de voz
              </Button>
            </div>
          </div>
        )}

        {/* Text Chat */}
        {!isVoiceMode && (
          <>
            <ScrollArea className="flex-1">
              <div className="max-w-2xl mx-auto py-4 space-y-4">
                {/* Welcome message */}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center pt-8 px-4 gap-4">
                    <Avatar className="w-20 h-20 ring-4 ring-primary/10">
                      <AvatarImage src={linguaAvatar} />
                      <AvatarFallback>L</AvatarFallback>
                    </Avatar>
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-bold text-foreground">¡Hola! Soy Lingua 🇬🇧</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        {assessment?.current_level
                          ? `Tu nivel actual es ${assessment.current_level} (${CEFR_LABELS[assessment.current_level]}). ¡Sigamos practicando y mejorando tu inglés!`
                          : 'Soy tu tutora especialista en inglés. Vamos a evaluar tu nivel actual y crear un plan personalizado para que mejores. ¡Empecemos!'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {!assessment?.current_level ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => sendMessage("¡Hola! Quiero evaluar mi nivel de inglés")}>
                            🎯 Evaluar mi nivel
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => sendMessage("Soy principiante, quiero empezar desde cero")}>
                            🌱 Soy principiante
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => sendMessage("Quiero practicar grammar")}>
                            📝 Practicar gramática
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => sendMessage("Quiero ampliar mi vocabulario")}>
                            📚 Vocabulario
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => sendMessage("Quiero re-evaluar mi nivel")}>
                            🔄 Re-evaluar nivel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <AssessmentCard />

                {/* Messages */}
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex gap-3 px-4", msg.role === "user" ? "flex-row-reverse" : "")}>
                    {msg.role === "assistant" && (
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src={linguaAvatar} />
                        <AvatarFallback>L</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={cn(
                      "max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    )}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 px-4">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={linguaAvatar} />
                      <AvatarFallback>L</AvatarFallback>
                    </Avatar>
                    <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-border bg-card px-4 py-3">
              <div className="max-w-2xl mx-auto flex items-center gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe un mensaje..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputMessage.trim() || isLoading}
                  size="icon"
                  className="shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
