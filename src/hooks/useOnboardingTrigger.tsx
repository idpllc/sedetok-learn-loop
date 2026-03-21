import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useOnboardingTrigger = () => {
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const [initialStep, setInitialStep] = useState(1);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const checkOnboardingStatus = async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("perfil_completo_360, onboarding_paso_actual, onboarding_pospuesto_hasta")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile) return;

        if (profile.perfil_completo_360) return;

        const postponedUntil = profile.onboarding_pospuesto_hasta
          ? new Date(profile.onboarding_pospuesto_hasta)
          : null;

        if (postponedUntil && postponedUntil > new Date()) return;

        const localPostponedUntil = localStorage.getItem("onboarding_postponed_until");
        if (localPostponedUntil) {
          const postponedDate = new Date(localPostponedUntil);
          if (postponedDate > new Date()) return;
        }

        const savedStep = profile.onboarding_paso_actual || 1;
        setInitialStep(savedStep);

        // Only show onboarding when explicitly requested by the user
        // Do not auto-trigger based on session time
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  const openOnboarding = () => {
    setShouldShowOnboarding(true);
  };

  const closeOnboarding = () => {
    setShouldShowOnboarding(false);
  };

  return {
    shouldShowOnboarding,
    initialStep,
    openOnboarding,
    closeOnboarding,
  };
};
