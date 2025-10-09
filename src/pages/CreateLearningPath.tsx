import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PathBasicInfo } from "@/components/learning-paths/wizard/PathBasicInfo";
import { PathBuilder } from "@/components/learning-paths/wizard/PathBuilder";
import { PathReview } from "@/components/learning-paths/wizard/PathReview";
import { useLearningPaths } from "@/hooks/useLearningPaths";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const CreateLearningPath = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { createPath, updatePath } = useLearningPaths();
  const [currentStep, setCurrentStep] = useState(1);
  const [pathId, setPathId] = useState<string | null>(id || null);
  const [isLoading, setIsLoading] = useState(!!id);
  const [pathData, setPathData] = useState<any>({
    title: "",
    description: "",
    objectives: "",
    subject: "",
    topic: "",
    grade_level: "primaria",
    level: "",
    language: "Español",
    category: "matematicas",
    is_public: false,
    cover_url: "",
    enforce_order: false,
    require_quiz_pass: false,
    allow_collaboration: false,
    required_routes: [],
    tipo_aprendizaje: "",
  });

  // Cargar datos existentes si estamos en modo edición
  useEffect(() => {
    const loadPathData = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("learning_paths")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        if (data) {
          setPathData({
            title: data.title || "",
            description: data.description || "",
            objectives: data.objectives || "",
            subject: data.subject || "",
            topic: data.topic || "",
            grade_level: data.grade_level || "primaria",
            level: data.level || "",
            language: data.language || "Español",
            category: data.category || "matematicas",
            is_public: data.is_public || false,
            cover_url: data.cover_url || "",
            enforce_order: data.enforce_order || false,
            require_quiz_pass: data.require_quiz_pass || false,
            allow_collaboration: data.allow_collaboration || false,
            required_routes: data.required_routes || [],
            tipo_aprendizaje: data.tipo_aprendizaje || "",
          });
        }
      } catch (error: any) {
        console.error("Error loading path:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar la ruta",
          variant: "destructive",
        });
        navigate("/learning-paths");
      } finally {
        setIsLoading(false);
      }
    };

    loadPathData();
  }, [id, navigate, toast]);

  const steps = [
    { number: 1, title: "Información Básica", component: PathBasicInfo },
    { number: 2, title: "Constructor Visual", component: PathBuilder },
    { number: 3, title: "Revisión y Publicación", component: PathReview },
  ];

  const progress = (currentStep / steps.length) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-2 w-full" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </main>
      </div>
    );
  }

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
                <h1 className="text-xl font-bold">
                  {id ? "Editar" : "Crear"} Ruta de Aprendizaje
                </h1>
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
