import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PathBasicInfo } from "@/components/learning-paths/wizard/PathBasicInfo";
import { PathBuilder } from "@/components/learning-paths/wizard/PathBuilder";
import { PathReview } from "@/components/learning-paths/wizard/PathReview";
import { useLearningPaths } from "@/hooks/useLearningPaths";

const CreateLearningPath = () => {
  const navigate = useNavigate();
  const { createPath, updatePath } = useLearningPaths();
  const [currentStep, setCurrentStep] = useState(1);
  const [pathId, setPathId] = useState<string | null>(null);
  const [pathData, setPathData] = useState({
    title: "",
    description: "",
    objectives: "",
    subject: "",
    topic: "",
    grade_level: "primaria" as const,
    level: "",
    language: "Español",
    category: "matematicas" as const,
    is_public: false,
    cover_url: "",
    enforce_order: false,
    require_quiz_pass: false,
    allow_collaboration: false,
    required_routes: [] as string[],
  });

  const steps = [
    { number: 1, title: "Información Básica", component: PathBasicInfo },
    { number: 2, title: "Constructor Visual", component: PathBuilder },
    { number: 3, title: "Revisión y Publicación", component: PathReview },
  ];

  const progress = (currentStep / steps.length) * 100;

  const handleNext = async () => {
    // Si es el primer paso, crear la ruta
    if (currentStep === 1 && !pathId) {
      const result = await createPath.mutateAsync(pathData);
      setPathId(result.id);
    } else if (pathId) {
      // Actualizar la ruta existente
      await updatePath.mutateAsync({ id: pathId, updates: pathData });
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    if (pathId) {
      await updatePath.mutateAsync({
        id: pathId,
        updates: pathData as any,
      });
    } else {
      const result = await createPath.mutateAsync(pathData as any);
      setPathId(result.id);
    }
    navigate("/learning-paths");
  };

  const CurrentStepComponent = steps[currentStep - 1].component;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/learning-paths")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Crear Ruta de Aprendizaje</h1>
                <p className="text-sm text-muted-foreground">
                  Paso {currentStep} de {steps.length}: {steps[currentStep - 1].title}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSaveDraft}>
              <Save className="w-4 h-4 mr-2" />
              Guardar borrador
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <CurrentStepComponent
          data={pathData}
          onChange={setPathData}
          pathId={pathId}
        />
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          <div className="flex gap-2">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`w-3 h-3 rounded-full transition-colors ${
                  step.number === currentStep
                    ? "bg-primary"
                    : step.number < currentStep
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          <Button onClick={handleNext}>
            {currentStep === steps.length ? "Publicar" : "Siguiente"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default CreateLearningPath;
