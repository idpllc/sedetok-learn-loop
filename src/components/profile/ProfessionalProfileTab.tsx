import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, GraduationCap, Award, ArrowRight, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProfessionalProfileTabProps {
  userId?: string;
  profile: any;
  hasEducation: boolean;
  hasExperience: boolean;
  hasSkills: boolean;
}

export const ProfessionalProfileTab = ({ 
  userId, 
  profile, 
  hasEducation, 
  hasExperience, 
  hasSkills 
}: ProfessionalProfileTabProps) => {
  const navigate = useNavigate();
  const completionPercentage = Math.round(
    ((hasEducation ? 1 : 0) + (hasExperience ? 1 : 0) + (hasSkills ? 1 : 0)) / 3 * 100
  );

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
      <CardContent className="p-4 md:p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Briefcase className="w-6 h-6 md:w-7 md:h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold">Perfil Profesional</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Currículum, experiencia y habilidades
                </p>
              </div>
            </div>
            <Badge variant={completionPercentage === 100 ? "default" : "secondary"} className="text-xs">
              {completionPercentage}% completo
            </Badge>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <div className="text-center p-2 md:p-3 rounded-lg bg-background/50 border">
              <GraduationCap className={`w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 ${hasEducation ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-xs md:text-sm font-medium">Educación</div>
              <div className="text-[10px] md:text-xs text-muted-foreground">
                {hasEducation ? 'Completo' : 'Pendiente'}
              </div>
            </div>
            
            <div className="text-center p-2 md:p-3 rounded-lg bg-background/50 border">
              <Building2 className={`w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 ${hasExperience ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-xs md:text-sm font-medium">Experiencia</div>
              <div className="text-[10px] md:text-xs text-muted-foreground">
                {hasExperience ? 'Completo' : 'Pendiente'}
              </div>
            </div>
            
            <div className="text-center p-2 md:p-3 rounded-lg bg-background/50 border">
              <Award className={`w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 ${hasSkills ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-xs md:text-sm font-medium">Habilidades</div>
              <div className="text-[10px] md:text-xs text-muted-foreground">
                {hasSkills ? 'Completo' : 'Pendiente'}
              </div>
            </div>
          </div>

          {/* Institution badge if applicable */}
          {profile?.institution && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-xs md:text-sm font-medium">{profile.institution}</span>
            </div>
          )}

          {/* Action button */}
          <Button 
            onClick={() => navigate(`/profile/professional${userId ? `/${userId}` : ''}`)}
            className="w-full group"
            variant="default"
          >
            Ver Perfil Profesional Completo
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
