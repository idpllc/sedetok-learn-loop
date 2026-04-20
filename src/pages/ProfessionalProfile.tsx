import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";
import { ProfessionalProfile as ProfessionalProfileComponent } from "@/components/ProfessionalProfile";
import { CompleteProfilePrompt } from "@/components/profile/CompleteProfilePrompt";
import { ProfessionalProfileInfoModal } from "@/components/profile/ProfessionalProfileInfoModal";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AuthModal } from "@/components/AuthModal";
import { useState, useEffect } from "react";

const ProfessionalProfile = () => {
  const navigate = useNavigate();
  const { userId: urlUserId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  // Determine the target user ID - either from URL or current user
  const targetUserId = urlUserId || user?.id;
  const isOwnProfile = !urlUserId || urlUserId === user?.id;

  // Check if user needs to authenticate to view this profile
  useEffect(() => {
    if (!authLoading && urlUserId && !user) {
      setShowAuthModal(true);
    }
  }, [authLoading, urlUserId, user]);

  // Fetch profile data with caching
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
    staleTime: 5 * 60 * 1000,
  });

  // Show auth modal for anonymous users trying to access public profiles
  if (!authLoading && urlUserId && !user) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen bg-background flex items-center justify-center md:ml-64 pt-14 md:pt-0">
          <div className="text-center space-y-6 px-4 max-w-md">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold">Perfil Profesional</h2>
            <p className="text-muted-foreground">
              Inicia sesión o crea una cuenta gratuita para ver el perfil profesional de este usuario
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

  if (isLoading || !targetUserId) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen bg-background flex items-center justify-center md:ml-64 pt-14 md:pt-0">
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
      <div className="min-h-screen bg-background pb-20 md:ml-64 pt-14 md:pt-0">
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
            {isOwnProfile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowInfoModal(true)}
                aria-label="Información sobre el Perfil Profesional"
              >
                <Info className="w-5 h-5" />
              </Button>
            )}
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">
          <ProfessionalProfileComponent userId={targetUserId} />
        </main>

        {/* Info modal: auto-show first time for own profile, controllable via header button */}
        {isOwnProfile && (
          <ProfessionalProfileInfoModal
            autoShow
            open={showInfoModal ? true : undefined}
            onOpenChange={setShowInfoModal}
          />
        )}

        {/* Complete Profile Prompt */}
        {profileData && (
          <CompleteProfilePrompt 
            profile={profileData} 
            isOwnProfile={isOwnProfile} 
          />
        )}
      </div>
    </>
  );
};

export default ProfessionalProfile;
