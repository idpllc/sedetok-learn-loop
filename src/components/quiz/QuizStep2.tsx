import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Copy, Sparkles } from "lucide-react";
import { QuestionEditor } from "./QuestionEditor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEducoins } from "@/hooks/useEducoins";
import { useXP } from "@/hooks/useXP";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BuyEducoinsModal } from "@/components/BuyEducoinsModal";

export interface QuizQuestion {
  id: string;
  question_type: "multiple_choice" | "true_false" | "short_answer";
  question_text: string;
  image_url?: string;
  video_url?: string;
  feedback?: string;
  feedback_correct?: string;
  feedback_incorrect?: string;
  comparison_mode?: "exact" | "flexible";
  points: number;
  options: Array<{
    id: string;
    option_text: string;
    is_correct: boolean;
    order_index: number;
    image_url?: string;
    video_url?: string;
    showImageInput?: boolean;
    showVideoInput?: boolean;
  }>;
}

interface QuizStep2Props {
  questions: QuizQuestion[];
  onChange: (questions: QuizQuestion[]) => void;
  onTimeLimitChange?: (timeLimit: number) => void;
  quizContext?: {
    title: string;
    description?: string;
    category: string;
    grade_level: string;
    difficulty: string;
    document_url?: string;
  };
}

export const QuizStep2 = ({ questions, onChange, onTimeLimitChange, quizContext }: QuizStep2Props) => {
  const [selectedQuestion, setSelectedQuestion] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const { deductEducoins, showBuyModal, requiredAmount, closeBuyModal } = useEducoins();
  const { deductXP } = useXP();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: `temp-${Date.now()}`,
      question_type: "multiple_choice",
      question_text: "",
      points: 0, // Will be calculated automatically as 100/numQuestions
      options: [
        { id: `opt-1`, option_text: "", is_correct: false, order_index: 0 },
        { id: `opt-2`, option_text: "", is_correct: false, order_index: 1 },
      ],
    };
    onChange([...questions, newQuestion]);
    setSelectedQuestion(questions.length);
  };

  const updateQuestion = (index: number, updatedQuestion: QuizQuestion) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    onChange(newQuestions);
  };

  const deleteQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    onChange(newQuestions);
    if (selectedQuestion >= newQuestions.length) {
      setSelectedQuestion(Math.max(0, newQuestions.length - 1));
    }
  };

  const duplicateQuestion = (index: number) => {
    const questionToDuplicate = { ...questions[index] };
    questionToDuplicate.id = `temp-${Date.now()}`;
    questionToDuplicate.options = questionToDuplicate.options.map((opt, i) => ({
      ...opt,
      id: `opt-${Date.now()}-${i}`,
    }));
    const newQuestions = [...questions];
    newQuestions.splice(index + 1, 0, questionToDuplicate);
    onChange(newQuestions);
  };

  const generateWithAI = async () => {
    if (!quizContext) {
      toast.error("Falta el contexto del quiz para generar preguntas");
      return;
    }

    setPaymentDialogOpen(true);
  };

  const executeGeneration = async (useEducoins: boolean) => {
    if (!quizContext) return;

    const educoinCost = quizContext.document_url ? 5 : 3;
    const xpCost = quizContext.document_url ? 2000 : 1000;

    let success = false;
    if (useEducoins) {
      success = await deductEducoins(educoinCost, `Generar preguntas con IA${quizContext.document_url ? ' (con documento)' : ''}`);
    } else {
      success = await deductXP(xpCost, `Generar preguntas con IA${quizContext.document_url ? ' (con documento)' : ''}`, undefined);
    }

    if (!success) {
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz-questions', {
        body: {
          title: quizContext.title,
          description: quizContext.description,
          category: quizContext.category,
          grade_level: quizContext.grade_level,
          difficulty: quizContext.difficulty,
          numQuestions: 5,
          document_url: quizContext.document_url,
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.questions && data.questions.length > 0) {
        onChange([...questions, ...data.questions]);
        toast.success(`${data.questions.length} preguntas generadas con IA`);
        setSelectedQuestion(questions.length);
        
        // Update time limit if provided by AI
        if (data.estimated_time_minutes && onTimeLimitChange) {
          onTimeLimitChange(data.estimated_time_minutes);
          toast.success(`Tiempo estimado: ${data.estimated_time_minutes} minutos`);
        }
      } else {
        toast.error("No se generaron preguntas");
      }
    } catch (error) {
      console.error('Error al generar preguntas:', error);
      toast.error("Error al generar preguntas con IA");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePayWithEducoins = async () => {
    setPaymentDialogOpen(false);
    await executeGeneration(true);
  };

  const handlePayWithXP = async () => {
    setPaymentDialogOpen(false);
    await executeGeneration(false);
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[calc(100vh-300px)]">
      {/* Lista de preguntas */}
      <div className="lg:col-span-1 border rounded-lg p-4 bg-card">
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Preguntas ({questions.length})</h3>
            <Button size="sm" onClick={addQuestion}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {quizContext && (
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={generateWithAI}
              disabled={isGenerating}
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isGenerating ? "Generando..." : "Generar con IA"}
            </Button>
          )}
        </div>
        <ScrollArea className="h-[calc(100vh-400px)]">
          <div className="space-y-2">
            {questions.map((q, index) => (
              <div
                key={q.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedQuestion === index
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
                onClick={() => setSelectedQuestion(index)}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-medium">Pregunta {index + 1}</span>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-7 w-7 ${
                        selectedQuestion === index 
                          ? "hover:bg-primary-foreground/20 text-primary-foreground" 
                          : "hover:bg-muted-foreground/20"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateQuestion(index);
                      }}
                      title="Duplicar pregunta"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-7 w-7 ${
                        selectedQuestion === index 
                          ? "hover:bg-destructive/30 text-primary-foreground hover:text-destructive" 
                          : "hover:bg-destructive/20 hover:text-destructive"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteQuestion(index);
                      }}
                      title="Eliminar pregunta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs line-clamp-2 opacity-80">
                  {q.question_text || "Sin título"}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Editor de pregunta */}
      <div className="lg:col-span-3 border rounded-lg p-6 bg-card overflow-y-auto max-h-[calc(100vh-300px)]">
        {questions.length > 0 ? (
          <QuestionEditor
            question={questions[selectedQuestion]}
            onChange={(updated) => updateQuestion(selectedQuestion, updated)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p>No hay preguntas todavía</p>
            <Button onClick={addQuestion} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Agregar primera pregunta
            </Button>
          </div>
        )}
      </div>
    </div>

    {/* Payment Dialog */}
    <AlertDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Selecciona tu método de pago</AlertDialogTitle>
          <AlertDialogDescription>
            Para generar preguntas con IA{quizContext?.document_url ? ' analizando el documento' : ''}, elige cómo pagar:
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          <Button
            variant="outline"
            className="flex flex-col h-auto py-4"
            onClick={handlePayWithEducoins}
          >
            <span className="text-2xl mb-2">💰</span>
            <span className="font-semibold">{quizContext?.document_url ? '5' : '3'} Educoins</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col h-auto py-4"
            onClick={handlePayWithXP}
          >
            <span className="text-2xl mb-2">⭐</span>
            <span className="font-semibold">{quizContext?.document_url ? '2000' : '1000'} XP</span>
          </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <BuyEducoinsModal
      open={showBuyModal}
      onOpenChange={closeBuyModal}
      requiredAmount={requiredAmount}
    />
  </>
  );
};
