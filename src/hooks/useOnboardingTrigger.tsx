import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useOnboardingTrigger = () => {
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false); // Disabled: always false
  const [initialStep, setInitialStep] = useState(1);
  const { user } = useAuth();

  // Onboarding 360 desactivado
  // useEffect(() => { ... }, [user]);

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
