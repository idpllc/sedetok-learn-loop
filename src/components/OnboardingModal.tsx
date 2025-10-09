import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Step components
import { Step1Welcome } from "./onboarding/Step1Welcome";
import { Step2LearningStyle } from "./onboarding/Step2LearningStyle";
import { Step3Interests } from "./onboarding/Step3Interests";
import { Step4Goals } from "./onboarding/Step4Goals";
import { Step5Gamification } from "./onboarding/Step5Gamification";
import { Step6Privacy } from "./onboarding/Step6Privacy";
import { Step7Complete } from "./onboarding/Step7Complete";

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStep?: number;
}

export const OnboardingModal = ({ open, onOpenChange, initialStep = 1 }: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [postponeDialogOpen, setPostponeDialogOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const { toast } = useToast();
  const { user } = useAuth();

  const totalSteps = 7;
  const progress = (currentStep / totalSteps) * 100;

  useEffect(() => {
    setCurrentStep(initialStep);
  }, [initialStep]);

  const updateFormData = (data: any) => {
    setFormData((prev: any) => ({ ...prev, ...data }));
  };

  const saveProgress = async () => {
    if (!user) return;

    try {
      console.log("Saving progress:", { currentStep, formData });
      
      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_paso_actual: currentStep,
          ...formData,
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error saving progress:", error);
        toast({
          title: "Error al guardar",
          description: "No se pudo guardar tu progreso. Intenta de nuevo.",
          variant: "destructive",
        });
      } else {
        console.log("Progress saved successfully");
      }
    } catch (error) {
      console.error("Error saving progress:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar tu progreso. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleNext = async () => {
    await saveProgress();
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      await completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePostpone = () => {
    setPostponeDialogOpen(true);
  };

  const confirmPostpone = async () => {
    if (!user) return;

    const postponeUntil = new Date();
    postponeUntil.setHours(postponeUntil.getHours() + 24);

    try {
      await supabase
        .from("profiles")
        .update({
          onboarding_paso_actual: currentStep,
          onboarding_pospuesto_hasta: postponeUntil.toISOString(),
        })
        .eq("id", user.id);

      localStorage.setItem("onboarding_postponed_until", postponeUntil.toISOString());
      
      toast({
        title: "Te recordaremos mañana",
        description: "Podrás completar tu perfil 360° cuando quieras desde tu perfil.",
      });

      onOpenChange(false);
      setPostponeDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar tu preferencia",
        variant: "destructive",
      });
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;

    try {
      console.log("Completing onboarding with data:", formData);
      
      const { error } = await supabase
        .from("profiles")
        .update({
          perfil_completo_360: true,
          onboarding_paso_actual: totalSteps,
          ...formData,
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error completing onboarding:", error);
        toast({
          title: "Error",
          description: "No se pudo completar el perfil",
          variant: "destructive",
        });
        return;
      }

      localStorage.removeItem("onboarding_step");
      localStorage.removeItem("onboarding_postponed_until");

      toast({
        title: "¡Perfil completado! 🎉",
        description: "Tu experiencia de aprendizaje ahora será completamente personalizada",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Error",
        description: "No se pudo completar el perfil",
        variant: "destructive",
      });
    }
  };

  const renderStep = () => {
    const stepProps = { formData, updateFormData };

    switch (currentStep) {
      case 1:
        return <Step1Welcome />;
      case 2:
        return <Step2LearningStyle {...stepProps} />;
      case 3:
        return <Step3Interests {...stepProps} />;
      case 4:
        return <Step4Goals {...stepProps} />;
      case 5:
        return <Step5Gamification {...stepProps} />;
      case 6:
        return <Step6Privacy {...stepProps} />;
      case 7:
        return <Step7Complete onComplete={completeOnboarding} />;
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <div className="sticky top-0 bg-card z-10 border-b border-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <DialogTitle className="text-lg">Perfil 360° - Paso {currentStep} de {totalSteps}</DialogTitle>
              </div>
              {currentStep > 1 && currentStep < totalSteps && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePostpone}
                >
                  Posponer
                </Button>
              )}
            </div>
            <Progress value={progress} className="h-1 rounded-none" />
          </div>

          <div className="p-6">
            {renderStep()}
          </div>

          <div className="sticky bottom-0 bg-card border-t border-border p-4 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i + 1 === currentStep
                      ? "bg-primary w-6"
                      : i + 1 < currentStep
                      ? "bg-primary/50"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <Button onClick={handleNext}>
              {currentStep === totalSteps ? "Finalizar" : "Siguiente"}
              {currentStep < totalSteps && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={postponeDialogOpen} onOpenChange={setPostponeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Posponer el perfil 360°?</AlertDialogTitle>
            <AlertDialogDescription>
              Puedes continuar después desde tu perfil. Te recordaremos en 24 horas.
              Tu progreso se guardará automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPostpone}>
              Posponer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
