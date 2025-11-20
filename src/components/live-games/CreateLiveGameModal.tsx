import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLiveGames, LiveGameQuestion } from "@/hooks/useLiveGames";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Search, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface CreateLiveGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateLiveGameModal = ({ open, onOpenChange }: CreateLiveGameModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createGame } = useLiveGames();
  const [title, setTitle] = useState("");
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<Omit<LiveGameQuestion, 'id' | 'game_id' | 'created_at'>[]>([]);

  const { data: quizzes } = useQuery({
    queryKey: ["quizzes-for-live-game", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("quizzes")
        .select("id, title, description, subject")
        .eq("status", "publicado")
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: previewQuestions } = useQuery({
    queryKey: ["quiz-preview", selectedQuizId],
    queryFn: async () => {
      if (!selectedQuizId) return null;
      
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("content_id", selectedQuizId)
        .order("order_index");

      if (error) throw error;
      return data;
    },
    enabled: !!selectedQuizId && showPreview,
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
    if (!selectedQuizId || !title) {
      toast({
        title: "Error",
        description: "Por favor completa el título y selecciona un quiz",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch quiz questions
      const { data: questions, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("content_id", selectedQuizId)
        .order("order_index");

      if (error) throw error;
      if (!questions || questions.length === 0) {
        toast({
          title: "Error",
          description: "El quiz seleccionado no tiene preguntas",
          variant: "destructive",
        });
        return;
      }

      const formattedQuestions = questions.map((q, index) => {
        // Ensure options is properly formatted
        let options: Array<{ text: string }> = [];
        
        if (Array.isArray(q.options)) {
          options = q.options.map((opt: any) => {
            if (typeof opt === 'string') {
              return { text: opt };
            } else if (opt && typeof opt === 'object' && 'text' in opt) {
              return { text: String(opt.text || '') };
            } else if (opt && typeof opt === 'object' && 'option_text' in opt) {
              return { text: String(opt.option_text || '') };
            }
            return { text: String(opt) };
          });
        }

        return {
          question_text: q.question_text,
          question_type: "multiple_choice" as const,
          options,
          correct_answer: q.correct_answer,
          points: q.points || 1000,
          time_limit: 20,
          order_index: index,
          image_url: q.image_url || undefined,
          video_url: q.video_url || undefined,
        };
      });

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
          onError: (error) => {
            toast({
              title: "Error al crear juego",
              description: error.message || "Ocurrió un error inesperado",
              variant: "destructive",
            });
          },
        }
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar las preguntas del quiz",
        variant: "destructive",
      });
    }
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
              <div className="space-y-3">
                <Label>Buscar Quiz</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por título o materia..."
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quizzes Disponibles</Label>
                <ScrollArea className="h-[300px] w-full border rounded-md p-4">
                  {quizzes && quizzes.length > 0 ? (
                    <div className="space-y-2">
                      {quizzes.map((quiz) => (
                        <Card
                          key={quiz.id}
                          className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                            selectedQuizId === quiz.id
                              ? "border-primary bg-primary/5"
                              : ""
                          }`}
                          onClick={() => {
                            setSelectedQuizId(quiz.id);
                            setShowPreview(false);
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{quiz.title}</h4>
                              {quiz.subject && (
                                <Badge variant="secondary" className="mt-1">
                                  {quiz.subject}
                                </Badge>
                              )}
                              {quiz.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {quiz.description}
                                </p>
                              )}
                            </div>
                            {selectedQuizId === quiz.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowPreview(!showPreview);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchQuery
                        ? "No se encontraron quizzes"
                        : "No hay quizzes disponibles"}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {showPreview && selectedQuizId && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Vista Previa
                  </h4>
                  <ScrollArea className="h-[200px]">
                    {previewQuestions ? (
                      <div className="space-y-3">
                        {previewQuestions.map((q, idx) => (
                          <div key={q.id} className="border-l-2 border-primary pl-3">
                            <p className="text-sm font-medium">
                              {idx + 1}. {q.question_text}
                            </p>
                            <div className="text-xs text-muted-foreground mt-1">
                              {Array.isArray(q.options) ? q.options.length : 0} opciones
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Cargando preguntas...
                      </div>
                    )}
                  </ScrollArea>
                </Card>
              )}

              <Button
                onClick={handleCreateFromQuiz}
                disabled={!selectedQuizId || !title || createGame.isPending}
                className="w-full"
              >
                {createGame.isPending ? "Creando..." : "Crear Juego"}
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