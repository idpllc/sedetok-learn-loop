import { useEffect, useState, useCallback } from 'react';
import { useConversation } from '@11labs/react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoiceConversationProps {
  onClose: () => void;
}

export const VoiceConversation = ({ onClose }: VoiceConversationProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [agentId, setAgentId] = useState<string>('');

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs');
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs');
    },
    onMessage: (message) => {
      console.log('Message:', message);
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

  const startConversation = useCallback(async () => {
    try {
      setIsLoading(true);

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL from our edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-signed-url', {
        body: { agent_id: agentId }
      });

      if (error) throw error;

      // Start the conversation with the signed URL
      await conversation.startSession({ 
        signedUrl: data.signed_url 
      });

      toast({
        title: "Conversación iniciada",
        description: "Ya puedes hablar con SEDE AI",
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

  useEffect(() => {
    return () => {
      if (conversation.status === 'connected') {
        conversation.endSession();
      }
    };
  }, [conversation]);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center space-y-6">
          {/* Animated orb */}
          <div className="relative w-32 h-32 mx-auto">
            <div 
              className={`absolute inset-0 rounded-full bg-gradient-to-br from-primary to-primary/50 transition-all duration-300 ${
                conversation.isSpeaking 
                  ? 'animate-pulse scale-110' 
                  : 'scale-100'
              }`}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {conversation.status === 'connected' ? (
                conversation.isSpeaking ? (
                  <div className="flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-white rounded-full animate-pulse"
                        style={{
                          height: '24px',
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <Mic className="w-12 h-12 text-white" />
                )
              ) : (
                <MicOff className="w-12 h-12 text-white/50" />
              )}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-2">
              {conversation.status === 'connected' 
                ? 'Conversando con SEDE AI' 
                : 'Modo Conversación'}
            </h2>
            <p className="text-muted-foreground">
              {conversation.status === 'connected'
                ? conversation.isSpeaking 
                  ? 'SEDE AI está hablando...'
                  : 'Estoy escuchando...'
                : 'Habla naturalmente con tu asistente educativo'}
            </p>
          </div>

          {conversation.status === 'disconnected' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="ID del agente de ElevenLabs"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button
                onClick={startConversation}
                disabled={isLoading || !agentId}
                className="w-full"
                size="lg"
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
            </div>
          )}

          {conversation.status === 'connected' && (
            <Button
              onClick={endConversation}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              <MicOff className="mr-2 h-4 w-4" />
              Terminar Conversación
            </Button>
          )}

          {conversation.status === 'disconnected' && (
            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full"
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
