import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Wand2, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const TriviaAdminPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  
  const levels = [
    { value: "primaria", label: "Primaria" },
    { value: "secundaria", label: "Secundaria" },
    { value: "universidad", label: "Universidad" },
    { value: "libre", label: "Libre" },
  ];

  const [newQuestion, setNewQuestion] = useState({
    category_id: "",
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: 0,
    difficulty: "medium",
    points: 100,
    level: "libre",
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["trivia-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trivia_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch questions
  const { data: questions, isLoading } = useQuery({
    queryKey: ["trivia-admin-questions", selectedCategory, selectedLevel],
    queryFn: async () => {
      let query = supabase
        .from("trivia_questions")
        .select(`
          *,
          category:category_id (
            name,
            icon,
            color
          )
        `)
        .order("created_at", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory);
      }

      if (selectedLevel !== "all") {
        query = query.eq("level", selectedLevel);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Add question mutation
  const addQuestion = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { error } = await supabase
        .from("trivia_questions")
        .insert([{
          ...newQuestion,
          created_by: user.id,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trivia-admin-questions"] });
      toast({ title: "Pregunta agregada exitosamente" });
      setShowAddQuestion(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete question mutation
  const deleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trivia_questions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trivia-admin-questions"] });
      toast({ title: "Pregunta eliminada" });
    },
  });

  // Generate questions with AI
  const [aiLevel, setAiLevel] = useState("libre");

  const generateQuestionsWithAI = async () => {
    if (!aiPrompt.trim() || !newQuestion.category_id) {
      toast({ title: "Error", description: "Selecciona una categoría y describe el tema", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-trivia-questions", {
        body: {
          category_id: newQuestion.category_id,
          prompt: aiPrompt,
          count: 5,
          level: aiLevel,
        },
      });

      if (error) throw error;

      if (data?.questions) {
        // Insert all generated questions
        const { data: { user } } = await supabase.auth.getUser();
        const questionsToInsert = data.questions.map((q: any) => ({
          ...q,
          category_id: newQuestion.category_id,
          created_by: user?.id,
          level: aiLevel,
        }));

        const { error: insertError } = await supabase
          .from("trivia_questions")
          .insert(questionsToInsert);

        if (insertError) throw insertError;

        queryClient.invalidateQueries({ queryKey: ["trivia-admin-questions"] });
        toast({ 
          title: "¡Preguntas generadas!", 
          description: `Se crearon ${data.questions.length} preguntas con IA` 
        });
        setAiPrompt("");
      }
    } catch (error: any) {
      toast({ 
        title: "Error al generar preguntas", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setNewQuestion({
      category_id: "",
      question_text: "",
      options: ["", "", "", ""],
      correct_answer: 0,
      difficulty: "medium",
      points: 100,
      level: "libre",
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoría</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Nivel</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los niveles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {levels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Generar Preguntas con IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Categoría</Label>
            <Select
              value={newQuestion.category_id}
              onValueChange={(value) => setNewQuestion({ ...newQuestion, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Nivel Educativo</Label>
            <Select value={aiLevel} onValueChange={setAiLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {levels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Describe el tema de las preguntas</Label>
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ej: Preguntas de matemáticas sobre fracciones para nivel básico"
              rows={3}
            />
          </div>

          <Button
            onClick={generateQuestionsWithAI}
            disabled={isGenerating || !newQuestion.category_id}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generar 5 Preguntas
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Add Question Button */}
      <Button onClick={() => setShowAddQuestion(true)} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Agregar Pregunta Manualmente
      </Button>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle>Preguntas ({questions?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions?.map((q: any) => {
            const category = Array.isArray(q.category) ? q.category[0] : q.category;
            return (
              <div key={q.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{ color: category?.color }}>
                        {category?.icon} {category?.name}
                      </span>
                    <span className="text-xs text-muted-foreground">
                      • {q.difficulty} • {q.points} pts • {levels.find(l => l.value === q.level)?.label || q.level}
                    </span>
                    </div>
                    <p className="font-medium">{q.question_text}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      {q.options.map((opt: string, idx: number) => (
                        <div
                          key={idx}
                          className={`p-2 rounded ${
                            idx === q.correct_answer ? 'bg-green-100 text-green-800' : 'bg-muted'
                          }`}
                        >
                          {idx === q.correct_answer && '✓ '}{opt}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteQuestion.mutate(q.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Add Question Dialog */}
      <AlertDialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Agregar Nueva Pregunta</AlertDialogTitle>
            <AlertDialogDescription>
              Completa todos los campos para crear una nueva pregunta
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Categoría</Label>
              <Select
                value={newQuestion.category_id}
                onValueChange={(value) => setNewQuestion({ ...newQuestion, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Pregunta</Label>
              <Textarea
                value={newQuestion.question_text}
                onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Opciones de Respuesta</Label>
              {newQuestion.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...newQuestion.options];
                      newOptions[index] = e.target.value;
                      setNewQuestion({ ...newQuestion, options: newOptions });
                    }}
                    placeholder={`Opción ${index + 1}`}
                  />
                  <Button
                    size="sm"
                    variant={newQuestion.correct_answer === index ? "default" : "outline"}
                    onClick={() => setNewQuestion({ ...newQuestion, correct_answer: index })}
                  >
                    {newQuestion.correct_answer === index ? "✓ Correcta" : "Marcar"}
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dificultad</Label>
                <Select
                  value={newQuestion.difficulty}
                  onValueChange={(value) => setNewQuestion({ ...newQuestion, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Fácil</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="hard">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Puntos</Label>
                <Input
                  type="number"
                  value={newQuestion.points}
                  onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={resetForm}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => addQuestion.mutate()}>
              Agregar Pregunta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
