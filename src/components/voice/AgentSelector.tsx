import { VOICE_AGENTS, VoiceAgent } from '@/lib/voiceAgents';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface AgentSelectorProps {
  onSelectAgent: (agent: VoiceAgent & { configuredAgentId: string }) => void;
  onClose: () => void;
}

export function AgentSelector({ onSelectAgent, onClose }: AgentSelectorProps) {
  const handleSelectAgent = (agent: VoiceAgent) => {
    onSelectAgent({ ...agent, configuredAgentId: agent.agentId });
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
              onClick={() => handleSelectAgent(agent)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16 rounded-lg">
                    <AvatarFallback 
                      className="rounded-lg text-xl text-white"
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

                <div className="mt-4">
                  <Button className="w-full">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Seleccionar
                  </Button>
                </div>
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
