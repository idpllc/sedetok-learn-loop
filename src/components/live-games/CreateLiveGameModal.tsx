import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLiveGames, LiveGameQuestion } from "@/hooks/useLiveGames";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface CreateLiveGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateLiveGameModal = ({ open, onOpenChange }: CreateLiveGameModalProps) => {
  const navigate = useNavigate();
  const { createGame } = useLiveGames();
  const [title, setTitle] = useState("");
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [customQuestions, setCustomQuestions] = useState<Omit<LiveGameQuestion, 'id' | 'game_id' | 'created_at'>[]>([]);

  const { data: quizzes } = useQuery({
    queryKey: ["quizzes-for-live-game"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title")
        .eq("status", "publicado")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleAddQuestion = () => {
    setCustomQuestions([
      ...customQuestions,
      {
        question_text: "",
        question_type: "multiple_choice",
        options: [
          { text: "" },
          { text: "" },
          { text: "" },
          { text: "" },
        ],
        correct_answer: 0,
        points: 1000,
        time_limit: 20,
        order_index: customQuestions.length,
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    setCustomQuestions(customQuestions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    const updated = [...customQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setCustomQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...customQuestions];
    const options = [...updated[qIndex].options];
    options[oIndex] = { text: value };
    updated[qIndex] = { ...updated[qIndex], options };
    setCustomQuestions(updated);
  };

  const handleCreateFromQuiz = async () => {
    if (!selectedQuizId || !title) return;

    // Fetch quiz questions
    const { data: questions } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("content_id", selectedQuizId)
      .order("order_index");

    if (!questions) return;

    const formattedQuestions = questions.map((q, index) => ({
      question_text: q.question_text,
      question_type: "multiple_choice",
      options: q.options as Array<{ text: string }>,
      correct_answer: q.correct_answer,
      points: q.points || 1000,
      time_limit: 20,
      order_index: index,
      image_url: q.image_url,
      video_url: q.video_url,
    }));

    createGame.mutate(
      {
        title,
        quiz_id: selectedQuizId,
        questions: formattedQuestions,
      },
      {
        onSuccess: (game) => {
          onOpenChange(false);
          navigate(`/live-games/host/${game.id}`);
        },
      }
    );
  };

  const handleCreateCustom = () => {
    if (!title || customQuestions.length === 0) return;

    createGame.mutate(
      {
        title,
        questions: customQuestions,
      },
      {
        onSuccess: (game) => {
          onOpenChange(false);
          navigate(`/live-games/host/${game.id}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Juego en Vivo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Título del Juego</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Matemáticas - Suma y Resta"
            />
          </div>

          <Tabs defaultValue="from-quiz">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="from-quiz">Desde Quiz Existente</TabsTrigger>
              <TabsTrigger value="custom">Crear Preguntas</TabsTrigger>
            </TabsList>

            <TabsContent value="from-quiz" className="space-y-4">
              <div>
                <Label>Seleccionar Quiz</Label>
                <Select value={selectedQuizId} onValueChange={setSelectedQuizId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un quiz..." />
                  </SelectTrigger>
                  <SelectContent>
                    {quizzes?.map((quiz) => (
                      <SelectItem key={quiz.id} value={quiz.id}>
                        {quiz.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCreateFromQuiz}
                disabled={!selectedQuizId || !title || createGame.isPending}
                className="w-full"
              >
                Crear Juego
              </Button>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <Button onClick={handleAddQuestion} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Pregunta
              </Button>

              {customQuestions.map((question, qIndex) => (
                <Card key={qIndex} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <Label>Pregunta {qIndex + 1}</Label>
                    <Button
                      onClick={() => handleRemoveQuestion(qIndex)}
                      variant="ghost"
                      size="icon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <Textarea
                    value={question.question_text}
                    onChange={(e) =>
                      handleQuestionChange(qIndex, "question_text", e.target.value)
                    }
                    placeholder="Escribe la pregunta..."
                  />

                  <div className="space-y-2">
                    <Label>Opciones</Label>
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex gap-2 items-center">
                        <Input
                          value={option.text}
                          onChange={(e) =>
                            handleOptionChange(qIndex, oIndex, e.target.value)
                          }
                          placeholder={`Opción ${oIndex + 1}`}
                        />
                        <input
                          type="radio"
                          name={`correct-${qIndex}`}
                          checked={question.correct_answer === oIndex}
                          onChange={() =>
                            handleQuestionChange(qIndex, "correct_answer", oIndex)
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Puntos</Label>
                      <Input
                        type="number"
                        value={question.points}
                        onChange={(e) =>
                          handleQuestionChange(qIndex, "points", Number(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <Label>Tiempo (segundos)</Label>
                      <Input
                        type="number"
                        value={question.time_limit}
                        onChange={(e) =>
                          handleQuestionChange(qIndex, "time_limit", Number(e.target.value))
                        }
                      />
                    </div>
                  </div>
                </Card>
              ))}

              {customQuestions.length > 0 && (
                <Button
                  onClick={handleCreateCustom}
                  disabled={!title || createGame.isPending}
                  className="w-full"
                >
                  Crear Juego ({customQuestions.length} preguntas)
                </Button>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateLiveGameModal;