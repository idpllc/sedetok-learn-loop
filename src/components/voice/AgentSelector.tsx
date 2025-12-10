import { VOICE_AGENTS, VoiceAgent } from '@/lib/voiceAgents';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Settings2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface AgentSelectorProps {
  onSelectAgent: (agent: VoiceAgent & { configuredAgentId: string }) => void;
  onClose: () => void;
}

export function AgentSelector({ onSelectAgent, onClose }: AgentSelectorProps) {
  const [customAgentId, setCustomAgentId] = useState<Record<string, string>>({});
  const [showConfig, setShowConfig] = useState<string | null>(null);

  const handleSelectAgent = (agent: VoiceAgent) => {
    const agentId = customAgentId[agent.id] || agent.agentId;
    if (!agentId) {
      setShowConfig(agent.id);
      return;
    }
    onSelectAgent({ ...agent, configuredAgentId: agentId });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Elige tu Tutor Virtual</h2>
          <p className="text-muted-foreground">
            Selecciona un avatar con IA para comenzar tu conversación
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {VOICE_AGENTS.map((agent) => (
            <Card 
              key={agent.id}
              className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16 rounded-lg">
                    <AvatarImage 
                      src={`${agent.avatarUrl.replace('.glb', '.png')}?size=256`}
                      alt={agent.name}
                    />
                    <AvatarFallback 
                      className="rounded-lg text-xl"
                      style={{ backgroundColor: agent.color }}
                    >
                      {agent.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {agent.description}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {agent.personality}
                    </p>
                  </div>
                </div>

                {showConfig === agent.id ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="mt-4 space-y-3"
                  >
                    <div className="space-y-2">
                      <Label htmlFor={`agent-id-${agent.id}`} className="text-sm">
                        ElevenLabs Agent ID
                      </Label>
                      <Input
                        id={`agent-id-${agent.id}`}
                        placeholder="Ingresa tu Agent ID de ElevenLabs"
                        value={customAgentId[agent.id] || ''}
                        onChange={(e) => setCustomAgentId(prev => ({
                          ...prev,
                          [agent.id]: e.target.value
                        }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Crea un agente en{' '}
                        <a 
                          href="https://elevenlabs.io/app/conversational-ai" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          ElevenLabs
                        </a>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        onClick={() => handleSelectAgent(agent)}
                        disabled={!customAgentId[agent.id]}
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        Iniciar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowConfig(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="mt-4 flex gap-2">
                    <Button 
                      className="flex-1"
                      onClick={() => handleSelectAgent(agent)}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Seleccionar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowConfig(agent.id)}
                    >
                      <Settings2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
