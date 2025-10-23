import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Award, Calendar } from "lucide-react";
import { useLearningPaths } from "@/hooks/useLearningPaths";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EducationSectionProps {
  userId?: string;
  complementaryEducation?: any[];
}

export const EducationSection = ({ userId, complementaryEducation }: EducationSectionProps) => {
  // Obtener rutas completadas
  const { data: completedPaths } = useQuery({
    queryKey: ["completed-paths", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_path_progress")
        .select(`
          *,
          learning_paths (
            id,
            title,
            description,
            category,
            total_xp
          )
        `)
        .eq("user_id", userId)
        .eq("completed", true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const hasContent = (complementaryEducation && complementaryEducation.length > 0) || 
                     (completedPaths && completedPaths.length > 0);

  if (!hasContent) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Formación Complementaria Manual */}
      {complementaryEducation && complementaryEducation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Formación Complementaria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {complementaryEducation.map((edu, index) => (
              <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                <GraduationCap className="w-8 h-8 text-primary mt-1" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{edu.title}</h3>
                      <p className="text-sm text-muted-foreground">{edu.institution}</p>
                    </div>
                    {edu.verified && (
                      <Badge variant="default">✓ Verificado</Badge>
                    )}
                  </div>
                  
                  {edu.date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {edu.date}
                    </div>
                  )}
                  
                  {edu.credential_url && (
                    <a 
                      href={edu.credential_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Ver credencial →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Rutas de Aprendizaje Completadas (SEDEtok) */}
      {completedPaths && completedPaths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-secondary" />
              Rutas de Aprendizaje Completadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {completedPaths.map((progress: any) => (
                <div key={progress.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{progress.learning_paths?.title}</h3>
                      <Badge variant="secondary" className="mt-1">
                        {progress.learning_paths?.category}
                      </Badge>
                    </div>
                    <Badge variant="default">
                      {progress.learning_paths?.total_xp} XP
                    </Badge>
                  </div>
                  
                  {progress.completed_at && (
                    <p className="text-xs text-muted-foreground">
                      Completada el {new Date(progress.completed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};