import { useState, useCallback, useEffect, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, ChevronLeft, ChevronRight, MessageCircle, Loader2, Volume2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { VOICE_AGENTS, type VoiceAgent } from "@/lib/voiceAgents";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import sofiaAvatar from "@/assets/avatars/sofia-avatar.png";
import alejandroAvatar from "@/assets/avatars/alejandro-avatar.png";

const avatarImages: Record<string, string> = {
  sofia: sofiaAvatar,
  alejandro: alejandroAvatar,
};

type ChatState = "collapsed" | "hidden" | "selecting" | "connecting" | "active";

export const FloatingTutorChat = () => {
  const { user } = useAuth();
  const [chatState, setChatState] = useState<ChatState>("collapsed");
  const [selectedAgent, setSelectedAgent] = useState<VoiceAgent | null>(null);
  const [transcript, setTranscript] = useState<Array<{ role: "user" | "agent"; text: string }>>([]);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const conversation = useConversation({
    onConnect: () => {
      setChatState("active");
      setTranscript([]);
    },
    onDisconnect: () => {
      setChatState("selecting");
    },
    onMessage: (message) => {
      if (message.type === "user_transcript") {
        const text = (message as any).user_transcription_event?.user_transcript;
        if (text) {
          setTranscript((prev) => [...prev, { role: "user", text }]);
        }
      } else if (message.type === "agent_response") {
        const text = (message as any).agent_response_event?.agent_response;
        if (text) {
          setTranscript((prev) => [...prev, { role: "agent", text }]);
        }
      }
    },
    onError: (error) => {
      console.error("Voice conversation error:", error);
      toast.error("Error en la conversación de voz");
      setChatState("selecting");
    },
  });

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const startConversation = useCallback(
    async (agent: VoiceAgent) => {
      setSelectedAgent(agent);
      setChatState("connecting");

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });

        const { data, error } = await supabase.functions.invoke("elevenlabs-signed-url", {
          body: { agentId: agent.agentId },
        });

        if (error || !data?.signed_url) {
          throw new Error("No se pudo obtener la conexión");
        }

        await conversation.startSession({
          signedUrl: data.signed_url,
        });
      } catch (err: any) {
        console.error("Failed to start conversation:", err);
        if (err.name === "NotAllowedError") {
          toast.error("Necesitas permitir el acceso al micrófono");
        } else {
          toast.error("Error al iniciar la conversación");
        }
        setChatState("selecting");
      }
    },
    [conversation]
  );

  const endConversation = useCallback(async () => {
    await conversation.endSession();
    setChatState("selecting");
    setTranscript([]);
  }, [conversation]);

  const handleFabClick = () => {
    if (!user) {
      toast.error("Inicia sesión para hablar con tu tutor");
      return;
    }
    setChatState("selecting");
  };

  const handleHide = () => {
    if (chatState === "active") {
      endConversation();
    }
    setChatState("hidden");
  };

  const handleClose = () => {
    if (chatState === "active") {
      endConversation();
    }
    setChatState("collapsed");
  };

  // Don't show on certain routes
  const hiddenRoutes = ["/auth", "/chat/login", "/auto-login"];
  if (typeof window !== "undefined" && hiddenRoutes.some((r) => window.location.pathname.startsWith(r))) {
    return null;
  }

  return (
    <>
      {/* Hidden tab on the right edge */}
      <AnimatePresence>
        {chatState === "hidden" && (
          <motion.button
            initial={{ x: 60 }}
            animate={{ x: 0 }}
            exit={{ x: 60 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={() => setChatState("selecting")}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center gap-1 px-1.5 py-4 rounded-l-xl bg-primary text-primary-foreground shadow-lg hover:pr-3 transition-all"
            aria-label="Abrir tutor"
          >
            <ChevronLeft className="w-4 h-4" />
            <MessageCircle className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <AnimatePresence>
        {chatState === "collapsed" && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-36 right-4 z-50"
          >
            <button
              onClick={handleFabClick}
              className="relative w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-float)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
              aria-label="Hablar con tutor"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {(chatState === "selecting" || chatState === "connecting" || chatState === "active") && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-20 right-4 z-50 w-80 max-h-[70vh] rounded-2xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
              <div className="flex items-center gap-2">
                {selectedAgent && chatState === "active" ? (
                  <>
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={avatarImages[selectedAgent.id]} />
                      <AvatarFallback>{selectedAgent.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-none">{selectedAgent.name}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        {conversation.isSpeaking ? (
                          <>
                            <Volume2 className="w-3 h-3 text-primary animate-pulse" /> Hablando...
                          </>
                        ) : (
                          <>
                            <Mic className="w-3 h-3 text-primary" /> Escuchando...
                          </>
                        )}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm font-semibold text-foreground">Elige tu tutor</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleHide}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                  aria-label="Ocultar"
                  title="Ocultar a un lado"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Agent Selection */}
              {chatState === "selecting" && (
                <div className="p-4 space-y-3">
                  <p className="text-xs text-muted-foreground text-center">
                    Selecciona un tutor para conversar por voz
                  </p>
                  {VOICE_AGENTS.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => startConversation(agent)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                    >
                      <Avatar className="w-12 h-12 ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
                        <AvatarImage src={avatarImages[agent.id]} />
                        <AvatarFallback>{agent.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="text-left flex-1">
                        <p className="font-semibold text-sm text-foreground">{agent.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{agent.description}</p>
                      </div>
                      <Mic className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  ))}
                </div>
              )}

              {/* Connecting */}
              {chatState === "connecting" && selectedAgent && (
                <div className="p-6 flex flex-col items-center justify-center gap-3">
                  <Avatar className="w-16 h-16 ring-4 ring-primary/20">
                    <AvatarImage src={avatarImages[selectedAgent.id]} />
                    <AvatarFallback>{selectedAgent.name[0]}</AvatarFallback>
                  </Avatar>
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Conectando con {selectedAgent.name}...</p>
                </div>
              )}

              {/* Active Conversation */}
              {chatState === "active" && selectedAgent && (
                <>
                  {/* Transcript */}
                  <div ref={transcriptRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] max-h-[40vh]">
                    {transcript.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center pt-8">
                        Habla para iniciar la conversación 🎤
                      </p>
                    )}
                    {transcript.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Voice indicator & controls */}
                  <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          conversation.isSpeaking ? "bg-primary animate-pulse" : "bg-accent animate-pulse"
                        }`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {conversation.isSpeaking ? "Tutor hablando" : "Tu turno"}
                      </span>
                    </div>
                    <Button variant="destructive" size="sm" onClick={endConversation} className="h-8 text-xs gap-1.5">
                      <MicOff className="w-3.5 h-3.5" />
                      Finalizar
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
