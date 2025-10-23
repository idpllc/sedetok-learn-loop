import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAcademicMetrics } from "@/hooks/useAcademicMetrics";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { SocialLinks } from "@/components/profile/SocialLinks";
import { WorkExperience } from "@/components/profile/WorkExperience";
import { ProjectsSection } from "@/components/profile/ProjectsSection";
import { SkillsSection } from "@/components/profile/SkillsSection";
import { EducationSection } from "@/components/profile/EducationSection";
import { CVGenerator } from "@/components/profile/CVGenerator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ProfessionalProfileProps {
  userId?: string;
}

export const ProfessionalProfile = ({ userId }: ProfessionalProfileProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: metrics, isLoading } = useAcademicMetrics(userId);
  const isOwnProfile = user?.id === userId;

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile-full", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      
      // Incrementar vistas si no es el propio perfil
      if (!isOwnProfile) {
        await supabase
          .from("profiles")
          .update({ profile_views: (data.profile_views || 0) + 1 })
          .eq("id", userId);
      }
      
      return data;
    },
    enabled: !!userId,
  });

  const handleUpdateCover = async (url: string) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "No se pudo identificar el usuario",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ cover_image_url: url })
        .eq("id", userId);
        
      if (error) throw error;
      
      await refetchProfile();
    } catch (error) {
      console.error("Error updating cover:", error);
      toast({
        title: "Error al actualizar portada",
        description: "No se pudo guardar la imagen en el perfil",
        variant: "destructive"
      });
    }
  };

  const handleUpdateAvatar = async (url: string) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "No se pudo identificar el usuario",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", userId);
        
      if (error) throw error;
      
      await refetchProfile();
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast({
        title: "Error al actualizar foto",
        description: "No se pudo guardar la imagen en el perfil",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Cargando perfil profesional...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header del Perfil */}
      {profile && (
        <ProfileHeader 
          profile={profile} 
          isOwnProfile={isOwnProfile}
          onUpdateCover={handleUpdateCover}
          onUpdateAvatar={handleUpdateAvatar}
        />
      )}

      {/* Enlaces Sociales */}
      {profile?.social_links && (
        <SocialLinks socialLinks={profile.social_links} />
      )}

      {/* Habilidades - Movidas arriba */}
      {profile?.skills && Array.isArray(profile.skills) && (
        <SkillsSection skills={profile.skills as any[]} />
      )}

      {/* Generador de CV - Ancho completo */}
      {isOwnProfile && profile && (
        <CVGenerator profile={profile} metrics={metrics} />
      )}

      {/* Educación Formal */}
      {profile?.education && Array.isArray(profile.education) && profile.education.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Educación Formal</CardTitle>
            <CardDescription>Formación académica y títulos obtenidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {profile.education.map((edu: any, index: number) => (
                <div key={index} className="border-l-2 border-primary pl-4 py-2">
                  <h4 className="font-semibold">{edu.degree} en {edu.field_of_study}</h4>
                  <p className="text-sm text-muted-foreground">{edu.institution}</p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <span>{edu.start_date}</span>
                    <span>-</span>
                    <span>{edu.currently_studying ? "Presente" : edu.end_date}</span>
                  </div>
                  {edu.description && (
                    <p className="text-sm mt-2">{edu.description}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Experiencia Laboral */}
      {profile?.work_experience && Array.isArray(profile.work_experience) && (
        <WorkExperience experiences={profile.work_experience as any[]} />
      )}

      {/* Proyectos */}
      {profile?.projects && Array.isArray(profile.projects) && (
        <ProjectsSection projects={profile.projects as any[]} />
      )}

      {/* Formación Complementaria */}
      <EducationSection 
        userId={userId}
        complementaryEducation={profile?.complementary_education && Array.isArray(profile.complementary_education) ? profile.complementary_education as any[] : undefined}
      />

    </div>
  );
};
