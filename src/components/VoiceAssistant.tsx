import { useEffect, useState, useCallback, useRef } from 'react';
import { useConversation } from '@11labs/react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, X, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceAssistantProps {
  onClose: () => void;
  agentId?: string;
}

export const VoiceAssistant = ({ onClose, agentId }: VoiceAssistantProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [inputVolume, setInputVolume] = useState(0);
  const animationRef = useRef<number>();

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs Voice Agent');
      toast({
        title: "Conectado",
        description: "Ya puedes hablar con SEDE AI",
      });
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs');
      setTranscript('');
      setAiResponse('');
    },
    onMessage: (message) => {
      console.log('Message received:', message);
      // Handle messages based on source
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

  // Animate input volume
  useEffect(() => {
    const updateVolume = () => {
      if (conversation.status === 'connected') {
        const volume = conversation.getInputVolume?.() || 0;
        setInputVolume(volume);
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
        body: { agent_id: agentId }
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
  }, [agentId, conversation, toast]);

  const endConversation = useCallback(async () => {
    await conversation.endSession();
    onClose();
  }, [conversation, onClose]);

  // Only cleanup on unmount, not on conversation state changes
  useEffect(() => {
    return () => {
      conversation.endSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate orb scale based on speaking/listening state
  const orbScale = conversation.isSpeaking 
    ? 1.2 + Math.sin(Date.now() / 200) * 0.1
    : 1 + inputVolume * 0.3;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center"
    >
      <div className="relative w-full max-w-lg mx-4 flex flex-col items-center">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0 right-0 z-10"
          onClick={endConversation}
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Animated Orb */}
        <div className="relative w-48 h-48 mb-8">
          {/* Outer glow rings */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
            }}
            animate={{
              scale: conversation.status === 'connected' ? [1, 1.3, 1] : 1,
              opacity: conversation.status === 'connected' ? [0.5, 0.2, 0.5] : 0.3,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Middle ring */}
          <motion.div
            className="absolute inset-4 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
            }}
            animate={{
              scale: conversation.isSpeaking ? [1, 1.2, 1] : 1,
              opacity: conversation.isSpeaking ? [0.6, 0.3, 0.6] : 0.4,
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Main orb */}
          <motion.div
            className="absolute inset-8 rounded-full shadow-2xl flex items-center justify-center overflow-hidden"
            style={{
              background: conversation.status === 'connected'
                ? 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 50%, hsl(var(--primary) / 0.5) 100%)'
                : 'linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--muted-foreground) / 0.3) 100%)',
              boxShadow: conversation.status === 'connected' 
                ? '0 0 60px hsl(var(--primary) / 0.5), inset 0 0 30px hsl(var(--primary) / 0.3)'
                : '0 0 30px hsl(var(--muted) / 0.3)',
            }}
            animate={{
              scale: conversation.status === 'connected' ? orbScale : 1,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
          >
            {/* Inner highlight */}
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)',
              }}
            />
            
            {/* Icon */}
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Loader2 className="w-12 h-12 text-primary-foreground animate-spin" />
                </motion.div>
              ) : conversation.status === 'connected' ? (
                <motion.div
                  key="connected"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  {conversation.isSpeaking ? (
                    <Volume2 className="w-12 h-12 text-primary-foreground" />
                  ) : (
                    <Mic className="w-12 h-12 text-primary-foreground" />
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="disconnected"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <MicOff className="w-12 h-12 text-muted-foreground" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Sound wave visualization when speaking */}
          {conversation.isSpeaking && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border-2 border-primary/30"
                  initial={{ width: 120, height: 120, opacity: 0 }}
                  animate={{
                    width: [120, 200],
                    height: [120, 200],
                    opacity: [0.6, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.5,
                    ease: "easeOut",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Status text */}
        <motion.div 
          className="text-center mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold mb-2">
            {conversation.status === 'connected' 
              ? 'SEDE AI' 
              : 'Asistente de Voz'}
          </h2>
          <p className="text-muted-foreground">
            {isLoading
              ? 'Conectando...'
              : conversation.status === 'connected'
                ? conversation.isSpeaking 
                  ? 'Hablando...'
                  : 'Escuchando...'
                : 'Toca el botón para iniciar'}
          </p>
        </motion.div>

        {/* Transcript display */}
        <AnimatePresence>
          {(transcript || aiResponse) && conversation.status === 'connected' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-h-40 overflow-y-auto mb-6 px-4"
            >
              {transcript && (
                <div className="bg-muted/50 rounded-lg p-3 mb-2">
                  <p className="text-sm text-muted-foreground mb-1">Tú:</p>
                  <p className="text-sm">{transcript}</p>
                </div>
              )}
              {aiResponse && (
                <div className="bg-primary/10 rounded-lg p-3">
                  <p className="text-sm text-primary mb-1">SEDE AI:</p>
                  <p className="text-sm">{aiResponse}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <motion.div 
          className="flex gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
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
              <Button
                onClick={onClose}
                variant="outline"
                size="lg"
              >
                Cancelar
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
        </motion.div>
      </div>
    </motion.div>
  );
};
