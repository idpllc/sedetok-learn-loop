import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";
import { VocationalProfile as VocationalProfileComponent } from "@/components/profile/VocationalProfile";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AuthModal } from "@/components/AuthModal";
import { useAcademicMetrics } from "@/hooks/useAcademicMetrics";
import { useState, useEffect } from "react";

const VocationalProfile = () => {
  const navigate = useNavigate();
  const { userId: urlUserId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Determine the target user ID - either from URL or current user
  const targetUserId = urlUserId || user?.id;
  const isOwnProfile = !urlUserId || urlUserId === user?.id;

  // Check if user needs to authenticate to view this profile
  useEffect(() => {
    if (!authLoading && !isOwnProfile && !user) {
      setShowAuthModal(true);
    }
  }, [authLoading, isOwnProfile, user]);

  // Fetch profile data
  const { data: profileData, isLoading: profileLoading } = useQuery({
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

  // Fetch academic and intelligence metrics using the hook
  const { data: metrics } = useAcademicMetrics(targetUserId);

  // Show auth modal for anonymous users
  if (!authLoading && !isOwnProfile && !user) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen bg-background flex items-center justify-center md:ml-64 pt-20 md:pt-0">
          <div className="text-center space-y-6 px-4 max-w-md">
            <div className="text-6xl mb-4">🎓</div>
            <h2 className="text-2xl font-bold">Perfil Vocacional</h2>
            <p className="text-muted-foreground">
              Inicia sesión o crea una cuenta gratuita para ver el perfil vocacional
            </p>
            <Button 
              size="lg" 
              onClick={() => setShowAuthModal(true)}
              className="w-full"
            >
              Iniciar Sesión / Registrarse
            </Button>
          </div>
        </div>
        <AuthModal 
          open={showAuthModal} 
          onOpenChange={setShowAuthModal}
        />
      </>
    );
  }

  if (profileLoading || !targetUserId) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen bg-background flex items-center justify-center md:ml-64 pt-20 md:pt-0">
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4 animate-pulse">🎓</div>
            <p className="text-muted-foreground">Cargando perfil vocacional...</p>
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
                {isOwnProfile ? "Mi Perfil Vocacional" : `Perfil Vocacional de ${profileData?.full_name || profileData?.username || "Usuario"}`}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isOwnProfile 
                  ? "Recomendaciones de carreras basadas en tu desempeño y fortalezas"
                  : "Recomendaciones de carreras profesionales"
                }
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">
          <VocationalProfileComponent 
            areaMetrics={metrics?.areaMetrics}
            intelligenceMetrics={metrics?.intelligenceMetrics}
            userProfile={profileData}
          />
        </main>
      </div>
    </>
  );
};

export default VocationalProfile;
