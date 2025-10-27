import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Award, 
  Briefcase, 
  GraduationCap, 
  Target, 
  TrendingUp,
  X,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CompleteProfilePromptProps {
  profile: any;
  isOwnProfile: boolean;
}

export const CompleteProfilePrompt = ({ profile, isOwnProfile }: CompleteProfilePromptProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check if profile is incomplete
  const hasEducation = profile?.education && Array.isArray(profile.education) && profile.education.length > 0;
  const hasExperience = profile?.work_experience && Array.isArray(profile.work_experience) && profile.work_experience.length > 0;
  const hasSkills = profile?.skills && Array.isArray(profile.skills) && profile.skills.length > 0;
  const hasComplementaryEducation = profile?.complementary_education && Array.isArray(profile.complementary_education) && profile.complementary_education.length > 0;
  const hasProjects = profile?.projects && Array.isArray(profile.projects) && profile.projects.length > 0;
  const hasAwards = profile?.awards && Array.isArray(profile.awards) && profile.awards.length > 0;
  
  const totalSections = 6;
  const completedSections = [hasEducation, hasExperience, hasSkills, hasComplementaryEducation, hasProjects, hasAwards].filter(Boolean).length;
  const completionPercentage = Math.round((completedSections / totalSections) * 100);
  const isIncomplete = completionPercentage < 100;

  // Calculate potential XP
  const potentialXP = {
    education: hasEducation ? 0 : 50,
    experience: hasExperience ? 0 : 50,
    skills: hasSkills ? 0 : 50,
    complementary: hasComplementaryEducation ? 0 : 50,
    projects: hasProjects ? 0 : 50,
    awards: hasAwards ? 0 : 50,
  };
  
  const totalPotentialXP = Object.values(potentialXP).reduce((sum, xp) => sum + xp, 0);

  useEffect(() => {
    // Check if user has dismissed the prompt in this session
    const dismissedKey = `profile-prompt-dismissed-${profile?.id}`;
    const wasDismissed = sessionStorage.getItem(dismissedKey) === 'true';
    
    if (!wasDismissed && isOwnProfile && isIncomplete) {
      // Show prompt after a short delay
      const timer = setTimeout(() => {
        setOpen(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [profile?.id, isOwnProfile, isIncomplete]);

  const handleDismiss = () => {
    setOpen(false);
    setDismissed(true);
    // Remember dismissal for this session
    sessionStorage.setItem(`profile-prompt-dismissed-${profile?.id}`, 'true');
  };

  const handleEditProfile = () => {
    setOpen(false);
    navigate('/profile/edit');
  };

  if (!isOwnProfile || !isIncomplete || dismissed) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              ¡Completa tu Perfil Profesional!
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-base">
            Tu perfil está <strong>{completionPercentage}% completo</strong>. Complétalo para desbloquear todos los beneficios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* XP Badge */}
          <div className="flex items-center justify-center">
            <Badge className="text-lg px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500">
              <Award className="w-5 h-5 mr-2" />
              +{totalPotentialXP} XP disponibles
            </Badge>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground">Beneficios de completar tu perfil:</h4>
            
            <div className="space-y-2">
              {!hasEducation && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <GraduationCap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Agrega tu Educación</p>
                    <p className="text-xs text-muted-foreground">+{potentialXP.education} XP</p>
                  </div>
                </div>
              )}

              {!hasExperience && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Briefcase className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Agrega tu Experiencia Laboral</p>
                    <p className="text-xs text-muted-foreground">+{potentialXP.experience} XP</p>
                  </div>
                </div>
              )}

              {!hasSkills && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Award className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Agrega tus Habilidades</p>
                    <p className="text-xs text-muted-foreground">+{potentialXP.skills} XP</p>
                  </div>
                </div>
              )}

              {!hasComplementaryEducation && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Target className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Agrega Formación Complementaria</p>
                    <p className="text-xs text-muted-foreground">+{potentialXP.complementary} XP</p>
                  </div>
                </div>
              )}

              {!hasProjects && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <TrendingUp className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Agrega tus Proyectos</p>
                    <p className="text-xs text-muted-foreground">+{potentialXP.projects} XP</p>
                  </div>
                </div>
              )}

              {!hasAwards && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Award className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Agrega Premios y Reconocimientos</p>
                    <p className="text-xs text-muted-foreground">+{potentialXP.awards} XP</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-primary/20">
              <p className="text-sm text-center font-medium">
                🎯 Más visibilidad profesional y mejores oportunidades
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={handleEditProfile} className="w-full" size="lg">
            Editar Mi Perfil
          </Button>
          <Button onClick={handleDismiss} variant="ghost" className="w-full">
            Tal vez más tarde
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
