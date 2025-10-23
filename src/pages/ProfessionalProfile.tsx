import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";
import { ProfessionalProfile as ProfessionalProfileComponent } from "@/components/ProfessionalProfile";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ProfessionalProfile = () => {
  const navigate = useNavigate();
  const { userId: urlUserId } = useParams();
  const { user } = useAuth();
  
  // Determine the target user ID - either from URL or current user
  const targetUserId = urlUserId || user?.id;
  const isOwnProfile = !urlUserId || urlUserId === user?.id;

  // Fetch profile data
  const { data: profileData, isLoading } = useQuery({
    queryKey: ["profile", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetUserId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId,
  });

  if (isLoading || !targetUserId) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen bg-background flex items-center justify-center md:ml-64 pt-20 md:pt-0">
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4 animate-pulse">💼</div>
            <p className="text-muted-foreground">Cargando perfil profesional...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-background pb-20 md:ml-64 pt-20 md:pt-0">
        <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center gap-3 max-w-6xl mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate(isOwnProfile ? "/profile" : "/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">
                {isOwnProfile ? "Mi Perfil Profesional" : `Perfil Profesional de ${profileData?.full_name || profileData?.username || "Usuario"}`}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isOwnProfile 
                  ? "Análisis de tu desempeño académico e inteligencias múltiples"
                  : "Desempeño académico e inteligencias múltiples"
                }
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">
          <ProfessionalProfileComponent userId={targetUserId} />
        </main>
      </div>
    </>
  );
};

export default ProfessionalProfile;
