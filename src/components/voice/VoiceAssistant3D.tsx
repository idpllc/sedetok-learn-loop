import { useEffect, useState, useCallback, useRef } from 'react';
import { useConversation } from '@11labs/react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, X, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { AvatarScene } from './AvatarScene';
import { VoiceAgent } from '@/lib/voiceAgents';

interface VoiceAssistant3DProps {
  agent: VoiceAgent & { configuredAgentId: string };
  onClose: () => void;
}

export function VoiceAssistant3D({ agent, onClose }: VoiceAssistant3DProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState(0);
  const animationRef = useRef<number>();

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs Voice Agent');
      toast({
        title: "Conectado",
        description: `Ahora puedes hablar con ${agent.name}`,
      });
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs');
      setTranscript('');
      setAiResponse('');
    },
    onMessage: (message) => {
      console.log('Message received:', message);
      if (message.source === 'user') {
        setTranscript(message.message || '');
      } else if (message.source === 'ai') {
        setAiResponse(message.message || '');
      }
    },
    onError: (error) => {
      console.error('Conversation error:', error);
      toast({
        title: "Error de conversación",
        description: "Hubo un problema con la conexión de voz",
        variant: "destructive",
      });
    },
  });

  // Animate audio level for lip-sync
  useEffect(() => {
    const updateVolume = () => {
      if (conversation.status === 'connected') {
        const outputVol = conversation.getOutputVolume?.() || 0;
        const inputVol = conversation.getInputVolume?.() || 0;
        // Use output volume when speaking, input when listening
        const level = conversation.isSpeaking ? outputVol : inputVol;
        setAudioLevel(level);
      }
      animationRef.current = requestAnimationFrame(updateVolume);
    };
    
    if (conversation.status === 'connected') {
      animationRef.current = requestAnimationFrame(updateVolume);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [conversation.status, conversation]);

  const startConversation = useCallback(async () => {
    try {
      setIsLoading(true);

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL from our edge function
      const { data, error } = await supabase.functions.invoke('voice-assistant-session', {
        body: { agent_id: agent.configuredAgentId }
      });

      if (error) throw error;

      if (!data?.signed_url) {
        throw new Error('No se pudo obtener la URL de conexión');
      }

      // Start the conversation with the signed URL
      await conversation.startSession({ 
        signedUrl: data.signed_url 
      });

    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'No se pudo iniciar la conversación',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [agent.configuredAgentId, conversation, toast]);

  const endConversation = useCallback(async () => {
    await conversation.endSession();
    onClose();
  }, [conversation, onClose]);

  useEffect(() => {
    return () => {
      conversation.endSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-b from-background via-background to-background/95 z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div 
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ 
              backgroundColor: conversation.status === 'connected' 
                ? 'hsl(142 76% 36%)' 
                : 'hsl(var(--muted-foreground))' 
            }}
          />
          <div>
            <h2 className="font-semibold">{agent.name}</h2>
            <p className="text-xs text-muted-foreground">{agent.description}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={endConversation}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* 3D Avatar */}
      <div className="flex-1 relative min-h-0">
        <AvatarScene 
          avatarUrl={agent.avatarUrl}
          isSpeaking={conversation.isSpeaking}
          audioLevel={audioLevel}
        />
        
        {/* Glow effect when speaking */}
        {conversation.isSpeaking && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: `linear-gradient(to top, ${agent.color}20, transparent)`,
            }}
          />
        )}
      </div>

      {/* Status & Transcript */}
      <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-sm">
        {/* Status */}
        <div className="text-center mb-3">
          <p className="text-sm font-medium">
            {isLoading
              ? 'Conectando...'
              : conversation.status === 'connected'
                ? conversation.isSpeaking 
                  ? (
                    <span className="flex items-center justify-center gap-2">
                      <Volume2 className="w-4 h-4 animate-pulse" />
                      {agent.name} está hablando...
                    </span>
                  )
                  : (
                    <span className="flex items-center justify-center gap-2">
                      <Mic className="w-4 h-4 animate-pulse text-primary" />
                      Escuchando...
                    </span>
                  )
                : 'Toca el botón para iniciar'}
          </p>
        </div>

        {/* Transcript */}
        <AnimatePresence>
          {(transcript || aiResponse) && conversation.status === 'connected' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="max-h-32 overflow-y-auto mb-4 space-y-2"
            >
              {transcript && (
                <div className="bg-muted/50 rounded-lg p-2 text-sm">
                  <span className="text-muted-foreground">Tú: </span>
                  {transcript}
                </div>
              )}
              {aiResponse && (
                <div className="bg-primary/10 rounded-lg p-2 text-sm">
                  <span className="text-primary">{agent.name}: </span>
                  {aiResponse}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex justify-center gap-3">
          {conversation.status === 'disconnected' ? (
            <>
              <Button
                onClick={startConversation}
                disabled={isLoading}
                size="lg"
                className="px-8"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" />
                    Iniciar Conversación
                  </>
                )}
              </Button>
              <Button onClick={onClose} variant="outline" size="lg">
                Volver
              </Button>
            </>
          ) : (
            <Button
              onClick={endConversation}
              variant="destructive"
              size="lg"
              className="px-8"
            >
              <MicOff className="mr-2 h-4 w-4" />
              Terminar
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
