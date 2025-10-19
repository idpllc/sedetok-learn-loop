import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Copy, Sparkles } from "lucide-react";
import { QuestionEditor } from "./QuestionEditor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  quizContext?: {
    title: string;
    description?: string;
    category: string;
    grade_level: string;
    difficulty: string;
  };
}

export const QuizStep2 = ({ questions, onChange, quizContext }: QuizStep2Props) => {
  const [selectedQuestion, setSelectedQuestion] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: `temp-${Date.now()}`,
      question_type: "multiple_choice",
      question_text: "",
      points: 10,
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

  return (
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
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pregunta {index + 1}</span>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 hover:bg-primary-foreground/20"
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
                      className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
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
                <p className="text-xs mt-1 truncate opacity-80">
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
  );
};
