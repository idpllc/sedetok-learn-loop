import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Copy, GripVertical, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { WordOrderEditor } from "./WordOrderEditor";
import { GameQuestion } from "@/hooks/useGames";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEducoins } from "@/hooks/useEducoins";
import { useXP } from "@/hooks/useXP";
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
import { InteractiveImageEditor } from "./InteractiveImageEditor";
import { BuyEducoinsModal } from "@/components/BuyEducoinsModal";

interface GameStep2Props {
  questions: GameQuestion[];
  onChange: (questions: GameQuestion[]) => void;
  gameContext?: {
    title: string;
    description: string;
    category: string;
    grade_level: string;
    gameType: string;
  };
}

export const GameStep2 = ({ questions, onChange, gameContext }: GameStep2Props) => {
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const { balance, deductEducoins, showBuyModal, openBuyModal, closeBuyModal, requiredAmount } = useEducoins();
  const { deductXP } = useXP();

  // For interactive_image, render a completely different UI
  if (gameContext?.gameType === "interactive_image") {
    return (
      <div className="space-y-6">
        <InteractiveImageEditor
          value={{
            image_url: questions[0]?.image_url,
            points: questions.map((q, idx) => ({
              id: q.id || `point-${idx}`,
              x: q.point_x || 50,
              y: q.point_y || 50,
              question: q.question_text || "",
              feedback: q.feedback || "",
              lives_cost: q.lives_cost || 1,
            })),
          }}
          onChange={(value) => {
            const updatedQuestions: GameQuestion[] = value.points.map((point, idx) => ({
              id: questions[idx]?.id,
              image_url: value.image_url,
              point_x: point.x,
              point_y: point.y,
              question_text: point.question,
              feedback: point.feedback,
              lives_cost: point.lives_cost,
              correct_sentence: "",
              words: [],
              points: 10,
              order_index: idx,
            }));
            onChange(updatedQuestions);
          }}
        />

        <AlertDialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Generar Juego con IA</AlertDialogTitle>
              <AlertDialogDescription>
                Elige cómo pagar la generación automática del juego:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3 py-4">
              <Button 
                onClick={async () => {
                  const success = await deductEducoins(2, "Generación de juego con IA", false);
                  if (success) {
                    setShowPaymentDialog(false);
                  } else {
                    setShowPaymentDialog(false);
                    openBuyModal(2);
                  }
                }}
                className="w-full justify-start"
                variant="outline"
              >
                <span className="text-lg mr-2">💰</span>
                <div className="flex-1 text-left">
                  <div className="font-semibold">Pagar con Educoins</div>
                  <div className="text-xs text-muted-foreground">
                    Costo: 2 Educoins (Tienes: {balance || 0})
                  </div>
                </div>
              </Button>
              <Button 
                onClick={async () => {
                  const success = await deductXP(10000, "Generación de juego con IA");
                  if (success) {
                    setShowPaymentDialog(false);
                  } else {
                    setShowPaymentDialog(false);
                  }
                }}
                className="w-full justify-start"
                variant="outline"
              >
                <span className="text-lg mr-2">⭐</span>
                <div className="flex-1 text-left">
                  <div className="font-semibold">Pagar con XP</div>
                  <div className="text-xs text-muted-foreground">
                    Costo: 10,000 XP
                  </div>
                </div>
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
      </div>
    );
  }

  const addQuestion = () => {
    const newQuestion: GameQuestion = {
      question_text: "",
      correct_sentence: "",
      words: [],
      points: 10,
      order_index: questions.length,
    };
    onChange([...questions, newQuestion]);
    setSelectedQuestionIndex(questions.length);
  };

  const updateQuestion = (index: number, updatedQuestion: GameQuestion) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    onChange(newQuestions);
  };

  const deleteQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    // Reindex remaining questions
    newQuestions.forEach((q, i) => {
      q.order_index = i;
    });
    onChange(newQuestions);
    if (selectedQuestionIndex >= newQuestions.length && newQuestions.length > 0) {
      setSelectedQuestionIndex(newQuestions.length - 1);
    }
  };

  const duplicateQuestion = (index: number) => {
    const questionToDuplicate = { ...questions[index] };
    questionToDuplicate.order_index = questions.length;
    delete questionToDuplicate.id;
    onChange([...questions, questionToDuplicate]);
    setSelectedQuestionIndex(questions.length);
  };

  const generateWithAI = () => {
    if (!gameContext) {
      toast.error("Falta información del juego");
      return;
    }
    setShowPaymentDialog(true);
  };

  const executeGeneration = async () => {
    if (!gameContext) return;
    
    setIsGenerating(true);
    setShowPaymentDialog(false);
    
    try {
      const numQuestions = gameContext.gameType === 'word_wheel' ? 26 : 5;
      
      const { data, error } = await supabase.functions.invoke('generate-game-questions', {
        body: {
          title: gameContext.title,
          description: gameContext.description,
          category: gameContext.category,
          grade_level: gameContext.grade_level,
          gameType: gameContext.gameType,
          numQuestions,
        }
      });

      if (error) throw error;

      if (data.questions) {
        onChange(data.questions);
        toast.success(`${data.questions.length} preguntas generadas con IA`);
      } else if (data.left_items && data.right_items) {
        toast.success("Items generados con IA para conectar columnas");
      }
    } catch (error: any) {
      console.error('Error generando con IA:', error);
      toast.error(error.message || "Error al generar preguntas con IA");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePayWithEducoins = async () => {
    const success = await deductEducoins(2, "Generación de juego con IA", false);
    if (success) {
      await executeGeneration();
    } else {
      setShowPaymentDialog(false);
      openBuyModal(2);
    }
  };

  const handlePayWithXP = async () => {
    const success = await deductXP(10000, "Generación de juego con IA");
    if (success) {
      await executeGeneration();
    } else {
      setShowPaymentDialog(false);
    }
  };

  if (questions.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <p className="text-muted-foreground">No hay preguntas todavía</p>
          <div className="flex gap-2">
            <Button onClick={addQuestion}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar primera pregunta
            </Button>
            {gameContext && (
              <Button 
                onClick={generateWithAI} 
                variant="outline"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generar con IA
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <AlertDialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Generar Juego con IA</AlertDialogTitle>
              <AlertDialogDescription>
                Elige cómo pagar la generación automática del juego:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3 py-4">
              <Button 
                onClick={handlePayWithEducoins}
                className="w-full justify-start"
                variant="outline"
              >
                <span className="text-lg mr-2">💰</span>
                <div className="flex-1 text-left">
                  <div className="font-semibold">Pagar con Educoins</div>
                  <div className="text-xs text-muted-foreground">
                    Costo: 2 Educoins (Tienes: {balance || 0})
                  </div>
                </div>
              </Button>
              <Button 
                onClick={handlePayWithXP}
                className="w-full justify-start"
                variant="outline"
              >
                <span className="text-lg mr-2">⭐</span>
                <div className="flex-1 text-left">
                  <div className="font-semibold">Pagar con XP</div>
                  <div className="text-xs text-muted-foreground">
                    Costo: 10,000 XP
                  </div>
                </div>
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
  }

  const currentQuestion = questions[selectedQuestionIndex];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Questions List */}
      <div className="md:col-span-1 space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Preguntas ({questions.length})</h3>
          <div className="flex gap-1">
            {gameContext && (
              <Button 
                size="sm" 
                onClick={generateWithAI}
                variant="outline"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button size="sm" onClick={addQuestion}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {questions.map((question, index) => (
            <Card
              key={index}
              className={`cursor-pointer transition-colors ${
                selectedQuestionIndex === index ? "border-primary bg-accent" : ""
              }`}
              onClick={() => setSelectedQuestionIndex(index)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Pregunta {index + 1}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {question.question_text || "Sin título"}
                    </p>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {question.words.length} palabras
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateQuestion(index);
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteQuestion(index);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Question Editor */}
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Editar Pregunta {selectedQuestionIndex + 1}</CardTitle>
            <CardDescription>
              Configura la instrucción y las palabras que el usuario debe ordenar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentQuestion && (
              <WordOrderEditor
                question={currentQuestion}
                onChange={(updated) => updateQuestion(selectedQuestionIndex, updated)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generar Juego con IA</AlertDialogTitle>
            <AlertDialogDescription>
              Elige cómo pagar la generación automática del juego:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <Button 
              onClick={handlePayWithEducoins}
              className="w-full justify-start"
              variant="outline"
            >
              <span className="text-lg mr-2">💰</span>
              <div className="flex-1 text-left">
                <div className="font-semibold">Pagar con Educoins</div>
                <div className="text-xs text-muted-foreground">
                  Costo: 2 Educoins (Tienes: {balance || 0})
                </div>
              </div>
            </Button>
            <Button 
              onClick={handlePayWithXP}
              className="w-full justify-start"
              variant="outline"
            >
              <span className="text-lg mr-2">⭐</span>
              <div className="flex-1 text-left">
                <div className="font-semibold">Pagar con XP</div>
                <div className="text-xs text-muted-foreground">
                  Costo: 10,000 XP
                </div>
              </div>
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
    </div>
  );
};
