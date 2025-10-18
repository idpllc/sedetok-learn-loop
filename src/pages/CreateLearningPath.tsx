import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import { useAuth } from "@/hooks/useAuth";
import { subjects } from "@/lib/subjects";

const CreateLearningPath = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const cloneId = searchParams.get("clone");
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { createPath, updatePath, clonePath } = useLearningPaths(user?.id, 'created');
  const [currentStep, setCurrentStep] = useState(1);
  const [pathId, setPathId] = useState<string | null>(id || null);
  const [isLoading, setIsLoading] = useState(!!id || !!cloneId);
  const [isCloning, setIsCloning] = useState(!!cloneId);
  const [originalPathTitle, setOriginalPathTitle] = useState<string>("");
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
    estimated_duration: 0,
    tags: [],
  });

  // Cargar datos existentes si estamos en modo edición o clonación
  useEffect(() => {
    // Esperar a que la autenticación esté lista antes de validar permisos de edición
    if (id && authLoading) {
      return;
    }

    const loadPathData = async () => {
      const sourceId = id || cloneId;
      
      if (!sourceId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("learning_paths")
          .select("*")
          .eq("id", sourceId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          // Verificar permisos en modo edición
          if (id) {
            if (!user) {
              toast({
                title: "Inicia sesión",
                description: "Debes iniciar sesión para editar esta ruta",
                variant: "destructive",
              });
              navigate("/auth");
              return;
            }
            if (data.creator_id !== user.id) {
              toast({
                title: "Acceso denegado",
                description: "Solo el creador puede editar esta ruta",
                variant: "destructive",
              });
              navigate("/learning-paths");
              return;
            }
          }

          // Guardar el título original para mostrarlo en el título del clon
          if (cloneId) {
            setOriginalPathTitle(data.title || "");
          }

          const subjectValue = data.subject
            ? (subjects.find(s => s.label === data.subject)?.value || subjects.find(s => s.value === data.subject)?.value || data.subject)
            : "";

          const loadedData = {
            title: cloneId ? `${data.title} (Copia)` : (data.title || ""),
            description: data.description || "",
            objectives: data.objectives || "",
            subject: subjectValue,
            topic: data.topic || "",
            grade_level: data.grade_level || "primaria",
            level: data.level || "",
            language: data.language || "Español",
            category: data.category || "matematicas",
            is_public: cloneId ? false : (data.is_public || false),
            cover_url: data.cover_url || "",
            enforce_order: data.enforce_order || false,
            require_quiz_pass: data.require_quiz_pass || false,
            allow_collaboration: data.allow_collaboration || false,
            required_routes: data.required_routes || [],
            tipo_aprendizaje: data.tipo_aprendizaje || "",
            estimated_duration: data.estimated_duration || 0,
            tags: data.tags || [],
          };
          
          setPathData(loadedData);
        }
      } catch (error: any) {
        console.error("Error loading path:", error);
        toast({
          title: "Error",
          description: cloneId ? "No se pudo clonar la ruta" : "No se pudo cargar la ruta",
          variant: "destructive",
        });
        navigate("/learning-paths");
      } finally {
        setIsLoading(false);
      }
    };

    loadPathData();
  }, [id, cloneId, navigate, toast, user, clonePath, authLoading]);

  const steps = [
    { number: 1, title: "Información Básica", component: PathBasicInfo },
    { number: 2, title: "Constructor Visual", component: PathBuilder },
    { number: 3, title: "Revisión y Publicación", component: PathReview },
  ];

  const progress = (currentStep / steps.length) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-20 md:pt-0">
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
    // Si es el primer paso y no es clonación, crear la ruta (sin toast)
    if (currentStep === 1 && !pathId && !cloneId) {
      const result = await createPath.mutateAsync(pathData);
      setPathId(result.id);
    } else if (currentStep === 1 && !pathId && cloneId) {
      // Si es clonación, crear la ruta clonada (sin toast)
      const result = await clonePath.mutateAsync(cloneId);
      setPathId(result.id);
      setIsCloning(false);
    } else if (pathId) {
      // Si es el último paso, validar que no exista una ruta idéntica
      if (currentStep === steps.length) {
        const { data: pathContent } = await supabase
          .from("learning_path_content")
          .select("content_id, quiz_id")
          .eq("path_id", pathId)
          .order("order_index");

        if (pathContent && pathContent.length > 0) {
          // Buscar rutas con el mismo contenido
          const contentIds = pathContent.map(c => c.content_id).filter(Boolean);
          const quizIds = pathContent.map(c => c.quiz_id).filter(Boolean);

          // Verificar si existe otra ruta publicada con exactamente el mismo contenido
          const { data: existingPaths } = await supabase
            .from("learning_paths")
            .select(`
              id,
              learning_path_content(content_id, quiz_id)
            `)
            .neq("id", pathId)
            .eq("status", "published");

          const hasDuplicate = existingPaths?.some(path => {
            const existingContent = path.learning_path_content || [];
            if (existingContent.length !== pathContent.length) return false;
            
            const existingContentIds = existingContent.map((c: any) => c.content_id).filter(Boolean).sort();
            const existingQuizIds = existingContent.map((c: any) => c.quiz_id).filter(Boolean).sort();
            const currentContentIds = contentIds.sort();
            const currentQuizIds = quizIds.sort();

            return JSON.stringify(existingContentIds) === JSON.stringify(currentContentIds) &&
                   JSON.stringify(existingQuizIds) === JSON.stringify(currentQuizIds);
          });

          if (hasDuplicate) {
            toast({
              title: "Ruta duplicada",
              description: "Ya existe una ruta publicada con exactamente el mismo contenido. Por favor, agrega o modifica las cápsulas antes de publicar.",
              variant: "destructive",
            });
            return;
          }
        }

        // Actualizar status a published y mostrar toast
        const subjectLabel = pathData.subject ? (subjects.find(s => s.value === pathData.subject)?.label || subjects.find(s => s.label === pathData.subject)?.label || pathData.subject) : pathData.subject;
        await updatePath.mutateAsync({ 
          id: pathId, 
          updates: { 
            ...pathData,
            subject: subjectLabel,
            status: 'published',
            estimated_duration: pathData.estimated_duration,
            tags: pathData.tags || [],
            total_xp: pathData.total_xp 
          } 
        });
        
        toast({
          title: "¡Ruta publicada!",
          description: "Tu ruta de aprendizaje ha sido publicada exitosamente",
        });
      } else {
        // Actualizar la ruta existente en pasos intermedios (sin toast)
        const subjectLabel = pathData.subject ? (subjects.find(s => s.value === pathData.subject)?.label || subjects.find(s => s.label === pathData.subject)?.label || pathData.subject) : pathData.subject;
        await updatePath.mutateAsync({ id: pathId, updates: { ...pathData, subject: subjectLabel } });
      }
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Último paso - redirigir a mis rutas
      navigate("/learning-paths");
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    const subjectLabel = pathData.subject ? (subjects.find(s => s.value === pathData.subject)?.label || subjects.find(s => s.label === pathData.subject)?.label || pathData.subject) : pathData.subject;
    if (pathId) {
      await updatePath.mutateAsync({
        id: pathId,
        updates: { ...(pathData as any), subject: subjectLabel },
      });
    } else {
      const result = await createPath.mutateAsync({ ...(pathData as any), subject: subjectLabel });
      setPathId(result.id);
    }
    navigate("/learning-paths");
  };

  const CurrentStepComponent = steps[currentStep - 1].component;

  return (
    <div className="min-h-screen bg-background pb-20 pt-20 md:pt-0">
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
                  {id ? "Editar" : isCloning ? `Clonar: ${originalPathTitle}` : "Crear"} Ruta de Aprendizaje
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
