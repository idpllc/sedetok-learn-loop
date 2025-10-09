import { useState, useEffect } from "react";
import { X, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingTeaserProps {
  onOpenOnboarding: () => void;
}

export const OnboardingTeaser = ({ onOpenOnboarding }: OnboardingTeaserProps) => {
  const [visible, setVisible] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const checkProfile = async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("perfil_completo_360")
          .eq("id", user.id)
          .single();

        if (!profile?.perfil_completo_360) {
          const dismissed = localStorage.getItem("onboarding_teaser_dismissed");
          if (!dismissed) {
            setTimeout(() => setVisible(true), 10000); // Mostrar después de 10 segundos
          }
        }
      } catch (error) {
        console.error("Error checking profile:", error);
      }
    };

    checkProfile();
  }, [user]);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem("onboarding_teaser_dismissed", "true");
  };

  const handleClick = () => {
    setVisible(false);
    onOpenOnboarding();
  };

  if (!visible) return null;

  return (
    <Card className="fixed bottom-24 right-4 md:bottom-6 md:right-6 w-80 p-4 shadow-lg animate-fade-in z-50 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Target className="w-5 h-5 text-primary" />
        </div>
        
        <div className="flex-1">
          <h4 className="font-semibold mb-1">
            🎯 Mejora tus recomendaciones
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            Completa tu perfil 360° y obtén contenido personalizado a tu forma de aprender.
          </p>
          
          <Button 
            onClick={handleClick}
            className="w-full"
            size="sm"
          >
            Completar ahora
          </Button>
        </div>
      </div>
    </Card>
  );
};
