import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Compass, Brain, Target, ArrowRight, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface VocationalProfileTabProps {
  userId?: string;
  topIntelligences?: Array<{ intelligence: string; icon: string; score: number }>;
  hasVocationalProfile: boolean;
}

export const VocationalProfileTab = ({ 
  userId, 
  topIntelligences = [],
  hasVocationalProfile 
}: VocationalProfileTabProps) => {
  const navigate = useNavigate();
  const top3 = topIntelligences.slice(0, 3);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
      <CardContent className="p-4 md:p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Compass className="w-6 h-6 md:w-7 md:h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold">Perfil Vocacional</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Orientación de carreras y talentos
                </p>
              </div>
            </div>
            {hasVocationalProfile && (
              <Badge variant="default" className="text-xs">
                <Lightbulb className="w-3 h-3 mr-1" />
                Generado
              </Badge>
            )}
          </div>

          {/* Top intelligences */}
          {top3.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Tus inteligencias dominantes:</p>
              <div className="grid grid-cols-1 gap-2">
                {top3.map((intel, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border"
                  >
                    <span className="text-xl md:text-2xl">{intel.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs md:text-sm font-medium truncate">{intel.intelligence}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {intel.score}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 space-y-2">
              <Brain className="w-8 h-8 md:w-10 md:h-10 mx-auto text-muted-foreground" />
              <p className="text-xs md:text-sm text-muted-foreground">
                Completa actividades para descubrir tus inteligencias
              </p>
            </div>
          )}

          {/* Benefits preview */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
            <Target className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-xs md:text-sm">
              Recomendaciones personalizadas de carreras
            </span>
          </div>

          {/* Action button */}
          <Button 
            onClick={() => navigate(`/profile/vocational${userId ? `/${userId}` : ''}`)}
            className="w-full group"
            variant="default"
          >
            Ver Perfil Vocacional Completo
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
