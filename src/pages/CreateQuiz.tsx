import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Save, Upload } from "lucide-react";
import { QuizStep1 } from "@/components/quiz/QuizStep1";
import { QuizStep2, QuizQuestion } from "@/components/quiz/QuizStep2";
import { QuizStep3 } from "@/components/quiz/QuizStep3";
import { useQuizzes, useQuizQuestions } from "@/hooks/useQuizzes";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function CreateQuiz() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createQuiz } = useQuizzes();
  const { createQuestion } = useQuizQuestions();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    grade_level: "",
    difficulty: "basico",
    is_public: true,
    time_limit: undefined as number | undefined,
    random_order: false,
    final_message: "¡Excelente trabajo! Has completado el quiz.",
  });

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const updateFormData = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const canProceed = () => {
    if (currentStep === 1) {
      return formData.title && formData.category && formData.grade_level;
    }
    if (currentStep === 2) {
      return questions.length > 0 && questions.every(q => q.question_text && q.options.some(o => o.is_correct));
    }
    return true;
  };

  const handleSave = async (status: "borrador" | "publicado") => {
    if (!user) {
      toast.error("Debes iniciar sesión para crear un quiz");
      return;
    }

    if (!canProceed()) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    setIsPublishing(true);

    try {
      // Create quiz
      const quizData = {
        ...formData,
        creator_id: user.id,
        status,
      };

      const createdQuiz = await createQuiz.mutateAsync(quizData as any);

      // Create questions
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        await createQuestion.mutateAsync({
          content_id: createdQuiz.id,
          question_text: question.question_text,
          question_type: question.question_type,
          image_url: question.image_url,
          video_url: question.video_url,
          feedback: question.feedback,
          points: question.points,
          order_index: i,
          correct_answer: 0,
          options: question.options.map((opt, idx) => ({
            option_text: opt.option_text,
            is_correct: opt.is_correct,
            order_index: idx,
          })),
        } as any);
      }

      toast.success(status === "publicado" ? "¡Quiz publicado!" : "Quiz guardado como borrador");
      navigate("/profile");
    } catch (error) {
      console.error("Error saving quiz:", error);
      toast.error("Error al guardar el quiz");
    } finally {
      setIsPublishing(false);
    }
  };

  const steps = [
    { number: 1, title: "Datos Generales", description: "Información básica del quiz" },
    { number: 2, title: "Preguntas", description: "Crea las preguntas del quiz" },
    { number: 3, title: "Configuración", description: "Ajustes finales y publicación" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-5xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Crear Quiz</h1>
            <p className="text-sm text-muted-foreground">
              Paso {currentStep} de {steps.length}
            </p>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep >= step.number
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.number}
                </div>
                <p className="text-xs mt-2 text-center hidden md:block">{step.title}</p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    currentStep > step.number ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            <CardDescription>{steps[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep === 1 && <QuizStep1 formData={formData} onChange={updateFormData} />}
            {currentStep === 2 && <QuizStep2 questions={questions} onChange={setQuestions} />}
            {currentStep === 3 && (
              <QuizStep3 formData={formData} questions={questions} onChange={updateFormData} />
            )}
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <div className="flex gap-2">
            {currentStep === 3 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSave("borrador")}
                  disabled={isPublishing || !canProceed()}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar borrador
                </Button>
                <Button
                  onClick={() => handleSave("publicado")}
                  disabled={isPublishing || !canProceed()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Publicar
                </Button>
              </>
            )}

            {currentStep < 3 && (
              <Button
                onClick={() => setCurrentStep(Math.min(3, currentStep + 1))}
                disabled={!canProceed()}
              >
                Siguiente
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
