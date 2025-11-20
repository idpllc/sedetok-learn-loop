import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLiveGames, LiveGameQuestion } from "@/hooks/useLiveGames";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Search, Eye, Sparkles, Loader2, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/quiz/RichTextEditor";
import { OptionEditor } from "./OptionEditor";

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
  
  // AI generation states
  const [aiTopic, setAiTopic] = useState("");
  const [aiGradeLevel, setAiGradeLevel] = useState("");
  const [aiNumberOfQuestions, setAiNumberOfQuestions] = useState("5");
  const [aiDifficulty, setAiDifficulty] = useState("auto");

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
          { text: "", image_url: "" },
          { text: "", image_url: "" },
          { text: "", image_url: "" },
          { text: "", image_url: "" },
        ],
        correct_answer: 0,
        points: 1000,
        time_limit: 20,
        order_index: customQuestions.length,
        feedback: "",
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

  const handleOptionChange = (qIndex: number, oIndex: number, field: 'text' | 'image_url', value: string) => {
    const updated = [...customQuestions];
    const options = [...updated[qIndex].options];
    options[oIndex] = { ...options[oIndex], [field]: value };
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

  const generateWithAI = useMutation({
    mutationFn: async () => {
      console.log("Calling AI generation with:", { aiTopic, aiGradeLevel, aiNumberOfQuestions, aiDifficulty });
      
      const { data, error } = await supabase.functions.invoke('generate-live-game-questions', {
        body: {
          topic: aiTopic,
          gradeLevel: aiGradeLevel,
          numberOfQuestions: parseInt(aiNumberOfQuestions),
          difficulty: aiDifficulty === "auto" ? undefined : aiDifficulty,
        }
      });

      console.log("AI generation response:", { data, error });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      console.log("AI generation successful:", data);
      if (data.questions) {
        setCustomQuestions(data.questions);
        toast({
          title: "¡Preguntas generadas!",
          description: `Se generaron ${data.questions.length} preguntas con IA`,
        });
      }
    },
    onError: (error: any) => {
      console.error("AI generation error:", error);
      toast({
        title: "Error al generar preguntas",
        description: error.message || "No se pudieron generar las preguntas",
        variant: "destructive",
      });
    },
  });

  const handleGenerateWithAI = () => {
    if (!aiTopic || !aiGradeLevel || !aiNumberOfQuestions) {
      toast({
        title: "Campos incompletos",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    generateWithAI.mutate();
  };

  const handleCreateCustom = () => {
    if (!title || customQuestions.length === 0) {
      toast({
        title: "Error",
        description: "Por favor completa el título y agrega al menos una pregunta",
        variant: "destructive",
      });
      return;
    }

    console.log("Creating custom game with questions:", customQuestions);

    createGame.mutate(
      {
        title,
        questions: customQuestions,
      },
      {
        onSuccess: (game) => {
          console.log("Game created successfully:", game);
          onOpenChange(false);
          navigate(`/live-games/host/${game.id}`);
        },
        onError: (error) => {
          console.error("Error creating custom game:", error);
          toast({
            title: "Error al crear juego",
            description: error.message || "Ocurrió un error inesperado",
            variant: "destructive",
          });
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="from-quiz">Desde Quiz</TabsTrigger>
              <TabsTrigger value="ai">
                <Sparkles className="w-4 h-4 mr-1" />
                Generar con IA
              </TabsTrigger>
              <TabsTrigger value="custom">Crear Manual</TabsTrigger>
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

            <TabsContent value="ai" className="space-y-4">
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Sparkles className="w-4 h-4 mt-0.5 text-primary" />
                  <p>La IA generará preguntas educativas basadas en el tema y nivel que especifiques</p>
                </div>
              </Card>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="ai-topic">Tema de las Preguntas *</Label>
                  <Input
                    id="ai-topic"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="Ej: La Revolución Francesa, Fotosíntesis, Trigonometría..."
                  />
                </div>

                <div>
                  <Label htmlFor="ai-grade">Nivel Educativo *</Label>
                  <Select value={aiGradeLevel} onValueChange={setAiGradeLevel}>
                    <SelectTrigger id="ai-grade">
                      <SelectValue placeholder="Selecciona el nivel..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primaria">Primaria</SelectItem>
                      <SelectItem value="secundaria">Secundaria</SelectItem>
                      <SelectItem value="bachillerato">Bachillerato</SelectItem>
                      <SelectItem value="universidad">Universidad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ai-number">Número de Preguntas *</Label>
                  <Select value={aiNumberOfQuestions} onValueChange={setAiNumberOfQuestions}>
                    <SelectTrigger id="ai-number">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 preguntas</SelectItem>
                      <SelectItem value="5">5 preguntas</SelectItem>
                      <SelectItem value="10">10 preguntas</SelectItem>
                      <SelectItem value="15">15 preguntas</SelectItem>
                      <SelectItem value="20">20 preguntas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ai-difficulty">Dificultad (Opcional)</Label>
                  <Select value={aiDifficulty} onValueChange={setAiDifficulty}>
                    <SelectTrigger id="ai-difficulty">
                      <SelectValue placeholder="Automática" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automática</SelectItem>
                      <SelectItem value="fácil">Fácil</SelectItem>
                      <SelectItem value="intermedia">Intermedia</SelectItem>
                      <SelectItem value="difícil">Difícil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleGenerateWithAI}
                disabled={generateWithAI.isPending || !aiTopic || !aiGradeLevel}
                className="w-full"
              >
                {generateWithAI.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generando preguntas...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generar Preguntas con IA
                  </>
                )}
              </Button>

              {generateWithAI.isPending && (
                <Card className="p-4 border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Generando preguntas con IA...</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Esto puede tomar unos segundos
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {customQuestions.length > 0 && (
                <>
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label>Preguntas Generadas ({customQuestions.length})</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCustomQuestions([])}
                      >
                        Limpiar
                      </Button>
                    </div>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {customQuestions.map((q, idx) => (
                          <Card key={idx} className="p-3">
                            <p className="text-sm font-medium mb-2">
                              {idx + 1}. {q.question_text}
                            </p>
                            <div className="text-xs text-muted-foreground">
                              {q.options.length} opciones • {q.points} pts • {q.time_limit}s
                            </div>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <Button
                    onClick={handleCreateCustom}
                    disabled={!title || createGame.isPending}
                    className="w-full"
                  >
                    {createGame.isPending ? "Creando..." : "Crear Juego con Preguntas"}
                  </Button>
                </>
              )}
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <Button onClick={handleAddQuestion} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Pregunta
              </Button>

              <ScrollArea className="h-[600px] pr-4">
                {customQuestions.map((question, qIndex) => (
                  <Card key={qIndex} className="p-4 space-y-3 mb-4">
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

                    <div className="space-y-2">
                      <Label>Pregunta (Texto Enriquecido)</Label>
                      <RichTextEditor
                        content={question.question_text}
                        onChange={(content) =>
                          handleQuestionChange(qIndex, "question_text", content)
                        }
                        placeholder="Escribe la pregunta con formato..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Opciones</Label>
                      {question.options.map((option, oIndex) => (
                        <OptionEditor
                          key={oIndex}
                          option={option}
                          index={oIndex}
                          onTextChange={(value) =>
                            handleOptionChange(qIndex, oIndex, 'text', value)
                          }
                          onImageChange={(value) =>
                            handleOptionChange(qIndex, oIndex, 'image_url', value)
                          }
                        />
                      ))}
                    </div>

                    <div className="space-y-2">
                      <Label>Respuesta Correcta</Label>
                      <Select
                        value={String(question.correct_answer)}
                        onValueChange={(value) =>
                          handleQuestionChange(qIndex, "correct_answer", parseInt(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona la respuesta correcta" />
                        </SelectTrigger>
                        <SelectContent>
                          {question.options.map((_, idx) => (
                            <SelectItem key={idx} value={String(idx)}>
                              Opción {idx + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Retroalimentación (opcional)</Label>
                      <RichTextEditor
                        content={question.feedback || ""}
                        onChange={(content) =>
                          handleQuestionChange(qIndex, "feedback", content)
                        }
                        placeholder="Agrega retroalimentación que se mostrará después de la pregunta..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Puntos</Label>
                        <Input
                          type="number"
                          value={question.points}
                          onChange={(e) =>
                            handleQuestionChange(qIndex, "points", parseInt(e.target.value))
                          }
                          min={100}
                          step={100}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tiempo (segundos)</Label>
                        <Input
                          type="number"
                          value={question.time_limit}
                          onChange={(e) =>
                            handleQuestionChange(qIndex, "time_limit", parseInt(e.target.value))
                          }
                          min={5}
                          max={120}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </ScrollArea>

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