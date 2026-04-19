import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen, Clock, Award, Target, ChevronRight, Share2, Edit, Loader2, Users } from "lucide-react";
import { forwardRef, useState } from "react";
import { SharePathSheet } from "@/components/SharePathSheet";
import { PathEnrollmentsDialog } from "@/components/learning-paths/PathEnrollmentsDialog";
import { AuthModal } from "@/components/AuthModal";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePathEnrollment } from "@/hooks/usePathEnrollment";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  creatorName?: string;
  creatorAvatar?: string;
  pathType?: "ruta" | "curso";
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
  creatorName,
  creatorAvatar,
  pathType = "ruta",
  onStart,
  onNext,
  hasNext,
}, ref) => {
  const isCourse = pathType === "curso";
  const typeLabel = isCourse ? "Curso" : "Ruta";
  const startLabel = isCourse ? "Empezar Curso" : "Empezar Ruta";
  const continueLabel = isCourse ? "Continuar Curso" : "Continuar Ruta";
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCreator = Boolean(user?.id && creatorId && user.id === creatorId);
  const { isEnrolled, enroll } = usePathEnrollment(pathId);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isObjectivesExpanded, setIsObjectivesExpanded] = useState(false);
  const [showEnrollments, setShowEnrollments] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  const MAX_DESCRIPTION_LENGTH = 150;
  const shouldTruncateDescription = description && description.length > MAX_DESCRIPTION_LENGTH;
  const displayDescription = shouldTruncateDescription && !isDescriptionExpanded
    ? description.substring(0, MAX_DESCRIPTION_LENGTH) + "..."
    : description;

  const MAX_OBJECTIVES_LENGTH = 150;
  const shouldTruncateObjectives = objectives && objectives.length > MAX_OBJECTIVES_LENGTH;
  const displayObjectives = shouldTruncateObjectives && !isObjectivesExpanded
    ? objectives.substring(0, MAX_OBJECTIVES_LENGTH) + "..."
    : objectives;
  
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
      <div className="relative z-10 max-w-4xl w-full mx-auto px-4 pt-14 pb-4 md:px-12 md:py-16 lg:px-16 flex flex-col items-center justify-center overflow-y-auto max-h-screen">
        {/* Icon/Badge section */}
        <div className="mb-3 md:mb-8 flex flex-wrap items-center justify-center gap-1.5 md:gap-2">
          <Badge className="bg-primary text-primary-foreground text-[10px] md:text-sm px-2 py-0.5 md:px-4 md:py-2">
            <BookOpen className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            {typeLabel}
          </Badge>
          <Badge variant="secondary" className="text-[10px] md:text-sm px-2 py-0.5 md:px-4 md:py-2 capitalize">
            {category}
          </Badge>
          <Badge variant="outline" className="text-[10px] md:text-sm px-2 py-0.5 md:px-4 md:py-2 capitalize">
            {gradeLevel}
          </Badge>
        </div>

        {/* Title */}
        <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-center mb-2 md:mb-4 text-foreground leading-tight">
          {title}
        </h1>

        {/* Creator */}
        {creatorName && (
          <button
            onClick={() => creatorId && navigate(`/profile/${creatorId}`)}
            className="flex items-center gap-2 mb-3 md:mb-5 hover:opacity-80 transition-opacity"
          >
            <Avatar className="w-6 h-6 md:w-8 md:h-8">
              <AvatarImage src={creatorAvatar} />
              <AvatarFallback className="text-xs">
                {creatorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm md:text-base text-muted-foreground">
              Por <span className="font-semibold text-foreground">{creatorName}</span>
            </span>
          </button>
        )}

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
          <div className="text-center mb-4 md:mb-8 max-w-xl">
            <p className="text-sm md:text-lg text-muted-foreground leading-relaxed">
              {displayDescription}
              {shouldTruncateDescription && (
                <button
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="ml-1 text-primary hover:text-primary/80 font-medium underline"
                >
                  {isDescriptionExpanded ? "Ver menos" : "Ver más"}
                </button>
              )}
            </p>
          </div>
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
              {displayObjectives}
              {shouldTruncateObjectives && (
                <button
                  onClick={() => setIsObjectivesExpanded(!isObjectivesExpanded)}
                  className="ml-1 text-primary hover:text-primary/80 font-medium underline"
                >
                  {isObjectivesExpanded ? "Ver menos" : "Ver más"}
                </button>
              )}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex w-full max-w-xl flex-col gap-2 md:gap-4 items-center justify-center mb-2 md:mb-4">
          <div className="flex w-full flex-col sm:flex-row gap-2 md:gap-4 items-center justify-center">
            <Button
              size="lg"
              onClick={() => {
                if (!user) {
                  setAuthModalOpen(true);
                  return;
                }
                if (!isCreator && !isEnrolled && !isCourse) {
                  enroll.mutate(undefined, { onSuccess: () => onStart() });
                } else {
                  onStart();
                }
              }}
              disabled={enroll.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm md:text-xl px-6 py-3 md:px-12 md:py-8 rounded-2xl shadow-2xl hover:scale-105 transition-all duration-300 w-full sm:w-auto"
            >
              {enroll.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              {(isCourse ? isCreator : (isEnrolled || isCreator)) ? continueLabel : startLabel}
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 ml-2" />
            </Button>

            {isCreator && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate(`/learning-paths/edit/${pathId}`)}
                className="font-semibold text-sm md:text-lg px-6 py-4 md:px-8 md:py-8 rounded-2xl shadow-lg hover:scale-105 transition-all duration-300 w-full sm:w-auto"
              >
                <Edit className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Editar
              </Button>
            )}
          </div>

          <div className="grid w-full max-w-md grid-cols-2 gap-2 md:gap-4">
            <SharePathSheet
              pathId={pathId}
              pathTitle={title}
              isPublic={isPublic}
              trigger={
                <Button
                  size="lg"
                  variant="outline"
                  className="font-semibold text-sm md:text-lg px-4 py-4 md:px-8 md:py-6 rounded-2xl shadow-lg hover:scale-105 transition-all duration-300 w-full"
                >
                  <Share2 className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Compartir
                </Button>
              }
            />

            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowEnrollments(true)}
              className="font-semibold text-sm md:text-lg px-4 py-4 md:px-8 md:py-6 rounded-2xl shadow-lg hover:scale-105 transition-all duration-300 w-full"
            >
              <Users className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Suscritos
            </Button>
          </div>

          <PathEnrollmentsDialog
            open={showEnrollments}
            onOpenChange={setShowEnrollments}
            pathId={pathId}
            pathTitle={title}
            pathType={pathType}
          />

          <AuthModal
            open={authModalOpen}
            onOpenChange={setAuthModalOpen}
            onSuccess={() => {
              setAuthModalOpen(false);
            }}
          />
        </div>

        {/* Hint to scroll */}
        {hasNext && (
          <div className="mt-4 md:mt-8 text-center animate-bounce">
            <p className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2">Desliza para ver las cápsulas</p>
            <div className="w-5 h-8 md:w-6 md:h-10 rounded-full border-2 border-muted-foreground/30 mx-auto relative">
              <div className="w-1 h-2.5 md:w-1.5 md:h-3 bg-muted-foreground/50 rounded-full absolute top-1.5 md:top-2 left-1/2 -translate-x-1/2 animate-pulse" />
            </div>
          </div>
        )}

      </div>
    </div>
  );
});

PathInfoCard.displayName = "PathInfoCard";
