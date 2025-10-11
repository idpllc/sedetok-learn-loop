import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Award, Target, ChevronRight, Share2, Edit, Copy } from "lucide-react";
import { forwardRef } from "react";
import { SharePathSheet } from "@/components/SharePathSheet";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface PathInfoCardProps {
  pathId: string;
  title: string;
  description?: string;
  subject?: string;
  level?: string;
  category: string;
  gradeLevel: string;
  estimatedDuration?: number;
  totalXp?: number;
  objectives?: string;
  coverUrl?: string;
  contentCount: number;
  isPublic?: boolean;
  creatorId?: string;
  onStart: () => void;
  onNext?: () => void;
  hasNext?: boolean;
}

export const PathInfoCard = forwardRef<HTMLDivElement, PathInfoCardProps>(({
  pathId,
  title,
  description,
  subject,
  level,
  category,
  gradeLevel,
  estimatedDuration,
  totalXp,
  objectives,
  coverUrl,
  contentCount,
  isPublic = true,
  creatorId,
  onStart,
  onNext,
  hasNext,
}, ref) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCreator = user?.id === creatorId;
  return (
    <div 
      ref={ref}
      className="h-screen w-full snap-start snap-always flex items-center justify-center bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 relative overflow-hidden"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50" />
      
      {/* Cover image backdrop if available */}
      {coverUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm"
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
      )}

      {/* Main content container */}
      <div className="relative z-10 max-w-2xl w-full mx-auto px-4 py-8 md:px-6 md:py-12 flex flex-col items-center justify-center">
        {/* Icon/Badge section */}
        <div className="mb-4 md:mb-8 flex flex-wrap items-center justify-center gap-2">
          <Badge className="bg-primary text-primary-foreground text-xs md:text-sm px-2 py-1 md:px-4 md:py-2">
            <BookOpen className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            Ruta de Aprendizaje
          </Badge>
          <Badge variant="secondary" className="text-xs md:text-sm px-2 py-1 md:px-4 md:py-2 capitalize">
            {category}
          </Badge>
          <Badge variant="outline" className="text-xs md:text-sm px-2 py-1 md:px-4 md:py-2 capitalize">
            {gradeLevel}
          </Badge>
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-center mb-3 md:mb-4 text-foreground">
          {title}
        </h1>

        {/* Subject and Level */}
        {(subject || level) && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-3 md:mb-6">
            {subject && (
              <Badge variant="secondary" className="text-xs md:text-sm capitalize">
                {subject}
              </Badge>
            )}
            {level && (
              <Badge variant="outline" className="text-xs md:text-sm capitalize">
                Nivel: {level}
              </Badge>
            )}
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="text-center text-sm md:text-lg text-muted-foreground mb-4 md:mb-8 max-w-xl leading-relaxed">
            {description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 mb-4 md:mb-8">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-semibold text-sm md:text-base">{contentCount}</span>
            <span className="text-xs md:text-sm">Cápsulas</span>
          </div>
          
          {estimatedDuration && estimatedDuration > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-4 h-4 md:w-5 md:h-5" />
              <span className="font-semibold text-sm md:text-base">{estimatedDuration}</span>
              <span className="text-xs md:text-sm">minutos</span>
            </div>
          )}
          
          {totalXp && totalXp > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Award className="w-4 h-4 md:w-5 md:h-5" />
              <span className="font-semibold text-sm md:text-base">{totalXp}</span>
              <span className="text-xs md:text-sm">XP</span>
            </div>
          )}
        </div>

        {/* Objectives */}
        {objectives && (
          <div className="w-full max-w-xl mb-4 md:mb-8 p-4 md:p-6 rounded-xl bg-card/80 backdrop-blur-sm border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              <h3 className="font-semibold text-base md:text-lg">Objetivos</h3>
            </div>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
              {objectives}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 items-center justify-center w-full max-w-md mb-4">
          <Button
            size="lg"
            onClick={onStart}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base md:text-xl px-8 py-4 md:px-12 md:py-8 rounded-2xl shadow-2xl hover:scale-105 transition-all duration-300 w-full sm:w-auto"
          >
            Empezar Ruta
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 ml-2" />
          </Button>
          
          {isCreator ? (
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate(`/create-learning-path/${pathId}`)}
              className="font-semibold text-sm md:text-lg px-6 py-4 md:px-8 md:py-8 rounded-2xl shadow-lg hover:scale-105 transition-all duration-300 w-full sm:w-auto"
            >
              <Edit className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Editar
            </Button>
          ) : (
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate(`/create-learning-path?clone=${pathId}`)}
              className="font-semibold text-sm md:text-lg px-6 py-4 md:px-8 md:py-8 rounded-2xl shadow-lg hover:scale-105 transition-all duration-300 w-full sm:w-auto"
            >
              <Copy className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Clonar
            </Button>
          )}
          
          <SharePathSheet
            pathId={pathId}
            pathTitle={title}
            isPublic={isPublic}
            trigger={
              <Button
                size="lg"
                variant="outline"
                className="font-semibold text-sm md:text-lg px-6 py-4 md:px-8 md:py-8 rounded-2xl shadow-lg hover:scale-105 transition-all duration-300 w-full sm:w-auto"
              >
                <Share2 className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Compartir
              </Button>
            }
          />
        </div>

        {/* Hint to scroll */}
        {hasNext && (
          <div className="mt-8 text-center animate-bounce">
            <p className="text-sm text-muted-foreground mb-2">Desliza para ver las cápsulas</p>
            <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 mx-auto relative">
              <div className="w-1.5 h-3 bg-muted-foreground/50 rounded-full absolute top-2 left-1/2 -translate-x-1/2 animate-pulse" />
            </div>
          </div>
        )}

        {/* Navigation arrow for next */}
        {hasNext && onNext && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            className="absolute bottom-8 right-8 rounded-full w-14 h-14 bg-background/50 backdrop-blur-sm hover:bg-background/80"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        )}
      </div>
    </div>
  );
});

PathInfoCard.displayName = "PathInfoCard";
