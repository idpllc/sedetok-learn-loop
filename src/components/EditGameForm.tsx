import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import { GameColumnMatchEditor } from "@/components/game/GameColumnMatchEditor";
import { WordOrderEditor } from "@/components/game/WordOrderEditor";
import { WordWheelEditor } from "@/components/game/WordWheelEditor";
import { WordWheelQuestionsEditor } from "@/components/game/WordWheelQuestionsEditor";
import { InteractiveImageEditor } from "@/components/game/InteractiveImageEditor";
import { useGames, useGameQuestions, GameQuestion } from "@/hooks/useGames";
import { subjects, subjectToCategoryMap } from "@/lib/subjects";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface EditGameFormProps {
  gameData: any;
}

export const EditGameForm = ({ gameData }: EditGameFormProps) => {
  const navigate = useNavigate();
  const { updateGame } = useGames();
  const { questions, isLoading: questionsLoading, createQuestion, updateQuestion, deleteQuestion } = useGameQuestions(gameData.id);
  
  const [title, setTitle] = useState(gameData.title || "");
  const [description, setDescription] = useState(gameData.description || "");
  
  // Find the subject value from the stored data
  const initialSubject = gameData.subject 
    ? subjects.find(s => s.label === gameData.subject)?.value || gameData.subject
    : "";
    
  const [subject, setSubject] = useState(initialSubject);
  const [category, setCategory] = useState(gameData.category || "");
  const [gradeLevel, setGradeLevel] = useState(gameData.grade_level || "");
  const [tags, setTags] = useState<string[]>(gameData.tags || []);
  const [thumbnailUrl, setThumbnailUrl] = useState(gameData.thumbnail_url || "");
  const [gameType, setGameType] = useState(gameData.game_type || "word_order");
  const [timeLimit, setTimeLimit] = useState(gameData.time_limit || null);
  const [randomOrder, setRandomOrder] = useState(gameData.random_order || false);
  const [isPublic, setIsPublic] = useState(gameData.is_public ?? true);
  const [status, setStatus] = useState(gameData.status || "draft");
  
  // Column match specific
  const [leftColumnItems, setLeftColumnItems] = useState(gameData.left_column_items || []);
  const [rightColumnItems, setRightColumnItems] = useState(gameData.right_column_items || []);
  
  // Interactive image specific
  const [interactiveImageData, setInteractiveImageData] = useState<{
    image_url?: string;
    points: any[];
  }>({
    image_url: gameData.interactive_image_url || undefined,
    points: gameData.interactive_points || [],
  });
  
  // New question being added or question being edited
  const [newQuestion, setNewQuestion] = useState<GameQuestion | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Hydrate interactive image editor from existing questions
  useEffect(() => {
    if (gameType !== "interactive_image") return;
    const image = (questions || []).find((q: any) => q.image_url)?.image_url || interactiveImageData.image_url;
    const pts = (questions || []).map((q: any) => ({
      id: q.id,
      x: q.point_x ?? 50,
      y: q.point_y ?? 50,
      question: q.question_text,
      feedback: q.feedback,
      lives_cost: q.lives_cost ?? 1,
    }));
    if (image || pts.length) {
      setInteractiveImageData({ image_url: image, points: pts });
    }
  }, [gameType, JSON.stringify(questions)]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("El título es requerido");
      return;
    }

    if (!category) {
      toast.error("La categoría es requerida");
      return;
    }

    if (!gradeLevel) {
      toast.error("El nivel es requerido");
      return;
    }

    const updates: any = {
      title,
      description,
      category,
      grade_level: gradeLevel,
      subject: subject ? subjects.find(s => s.value === subject)?.label || subject : undefined,
      tags,
      thumbnail_url: thumbnailUrl,
      game_type: gameType,
      time_limit: timeLimit,
      random_order: randomOrder,
      is_public: isPublic,
      status,
    };

    if (gameType === "column_match") {
      updates.left_column_items = leftColumnItems;
      updates.right_column_items = rightColumnItems;
    }
    try {
      // First update base game fields
      await updateGame.mutateAsync({ id: gameData.id, updates });

      // If interactive image, sync questions to points
      if (gameType === "interactive_image") {
        if (!interactiveImageData.image_url) {
          toast.error("Sube una imagen para la imagen interactiva");
          return;
        }

        // Delete existing questions
        const existingIds = (questions || []).map((q: any) => q.id);
        if (existingIds.length) {
          await Promise.all(existingIds.map((qid: string) => deleteQuestion.mutateAsync(qid)));
        }

        // Create questions from points
        await Promise.all(
          interactiveImageData.points.map((p: any, index: number) =>
            createQuestion.mutateAsync({
              game_id: gameData.id,
              question_text: p.question || `Punto ${index + 1}`,
              correct_sentence: "N/A",
              words: [],
              points: 10,
              order_index: index,
              image_url: interactiveImageData.image_url,
              point_x: p.x,
              point_y: p.y,
              lives_cost: p.lives_cost || 1,
              feedback: p.feedback || "",
            } as any)
          )
        );
      }

      toast.success("Juego actualizado exitosamente");
      navigate("/profile");
    } catch (error) {
      console.error("Error updating game:", error);
      toast.error("Error al actualizar el juego");
    }
  };

  if (questionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Información del Juego</CardTitle>
          <CardDescription>Edita la información básica de tu juego</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del juego"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del juego"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Asignatura *</Label>
              <Combobox
                options={subjects}
                value={subject}
                onChange={(value) => {
                  const categoryValue = subjectToCategoryMap[value] || value;
                  setSubject(value);
                  setCategory(categoryValue);
                }}
                placeholder="Selecciona asignatura"
                searchPlaceholder="Buscar asignatura..."
                emptyMessage="No se encontró la asignatura."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">Nivel *</Label>
              <Select value={gradeLevel} onValueChange={setGradeLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primaria">Primaria</SelectItem>
                  <SelectItem value="secundaria">Secundaria</SelectItem>
                  <SelectItem value="preparatoria">Preparatoria</SelectItem>
                  <SelectItem value="universidad">Universidad</SelectItem>
                  <SelectItem value="libre">Libre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gameType">Tipo de Juego</Label>
              <Select value={gameType} onValueChange={setGameType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="word_order">Ordenar Palabras</SelectItem>
                  <SelectItem value="column_match">Conectar Columnas</SelectItem>
                  <SelectItem value="word_wheel">Ruleta de Palabras</SelectItem>
                  <SelectItem value="interactive_image">Imagen Interactiva</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeLimit">Tiempo límite (segundos)</Label>
              <Input
                id="timeLimit"
                type="number"
                min="0"
                value={timeLimit || ""}
                onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Sin límite"
              />
              <p className="text-xs text-muted-foreground">Dejar vacío para sin límite</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="public">Público</Label>
              <p className="text-sm text-muted-foreground">Permite que otros usuarios vean este juego</p>
            </div>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="random">Orden Aleatorio</Label>
              <p className="text-sm text-muted-foreground">Mezcla las opciones cada vez</p>
            </div>
            <Switch
              id="random"
              checked={randomOrder}
              onCheckedChange={setRandomOrder}
            />
          </div>
        </CardContent>
      </Card>

      {gameType === "word_order" && (
        <Card>
          <CardHeader>
            <CardTitle>Preguntas ({questions?.length || 0})</CardTitle>
            <CardDescription>Gestiona las preguntas de tu juego</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* List of existing questions */}
            {questions && questions.length > 0 && (
              <div className="space-y-3">
                {questions.map((q: any, index: number) => {
                  const isEditing = editingQuestionId === q.id;
                  
                  return (
                    <Card key={q.id} className={isEditing ? "border-2 border-primary" : "border-2"}>
                      {isEditing ? (
                        <CardContent className="p-4 space-y-4">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium">Editando Pregunta {index + 1}</h4>
                          </div>
                          <WordOrderEditor
                            question={newQuestion!}
                            onChange={setNewQuestion}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={async () => {
                                if (!newQuestion?.question_text || !newQuestion?.correct_sentence || newQuestion.words.length === 0) {
                                  toast.error("Completa todos los campos de la pregunta");
                                  return;
                                }
                                
                                try {
                                  await updateQuestion.mutateAsync({
                                    id: q.id,
                                    updates: {
                                      question_text: newQuestion.question_text,
                                      correct_sentence: newQuestion.correct_sentence,
                                      words: newQuestion.words,
                                      points: newQuestion.points,
                                      image_url: newQuestion.image_url,
                                      video_url: newQuestion.video_url,
                                    }
                                  });
                                  setEditingQuestionId(null);
                                  setNewQuestion(null);
                                  toast.success("Pregunta actualizada");
                                } catch (error) {
                                  toast.error("Error al actualizar pregunta");
                                }
                              }}
                              disabled={updateQuestion.isPending}
                            >
                              {updateQuestion.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              Guardar Cambios
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditingQuestionId(null);
                                setNewQuestion(null);
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </CardContent>
                      ) : (
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <h4 className="font-medium">Pregunta {index + 1}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{q.question_text}</p>
                              <p className="text-sm font-medium mt-2">Respuesta: {q.correct_sentence}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Palabras: {Array.isArray(q.words) ? q.words.join(", ") : ""}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingQuestionId(q.id);
                                  setNewQuestion({
                                    question_text: q.question_text,
                                    correct_sentence: q.correct_sentence,
                                    words: Array.isArray(q.words) ? q.words : [],
                                    points: q.points,
                                    order_index: q.order_index,
                                    image_url: q.image_url,
                                    video_url: q.video_url,
                                  });
                                }}
                                disabled={editingQuestionId !== null}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteQuestion.mutate(q.id)}
                                disabled={deleteQuestion.isPending}
                              >
                                {deleteQuestion.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Add new question form */}
            {!newQuestion ? (
              <Button 
                onClick={() => setNewQuestion({
                  question_text: "",
                  correct_sentence: "",
                  words: [],
                  points: 10,
                  order_index: questions?.length || 0,
                })} 
                className="w-full"
                disabled={editingQuestionId !== null}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Nueva Pregunta
              </Button>
            ) : editingQuestionId === null && (
              <Card className="border-2 border-primary">
                <CardHeader>
                  <CardTitle className="text-base">Nueva Pregunta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <WordOrderEditor
                    question={newQuestion}
                    onChange={setNewQuestion}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        if (!newQuestion.question_text || !newQuestion.correct_sentence || newQuestion.words.length === 0) {
                          toast.error("Completa todos los campos de la pregunta");
                          return;
                        }
                        
                        try {
                          await createQuestion.mutateAsync({
                            ...newQuestion,
                            game_id: gameData.id,
                          });
                          setNewQuestion(null);
                          toast.success("Pregunta agregada");
                        } catch (error) {
                          toast.error("Error al agregar pregunta");
                        }
                      }}
                      disabled={createQuestion.isPending}
                    >
                      {createQuestion.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Guardar Pregunta
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setNewQuestion(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {!questions || questions.length === 0 && !newQuestion && (
              <p className="text-center text-muted-foreground py-8">
                No hay preguntas aún. Agrega la primera pregunta.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {gameType === "word_wheel" && (
        <Card>
          <CardHeader>
            <CardTitle>Preguntas de Ruleta ({questions?.length || 0})</CardTitle>
            <CardDescription>Configura las preguntas para cada letra del abecedario</CardDescription>
          </CardHeader>
          <CardContent>
            <WordWheelQuestionsEditor
              questions={(questions || []).map(q => ({
                question_text: q.question_text,
                correct_sentence: q.correct_sentence,
                initial_letter: (q as any).initial_letter || "A",
                points: q.points,
                order_index: q.order_index,
              }))}
              onChange={(updated) => {
                // Delete all existing questions
                const deletePromises = (questions || []).map(q => 
                  deleteQuestion.mutateAsync(q.id)
                );
                
                Promise.all(deletePromises).then(() => {
                  // Create new questions
                  const createPromises = updated.map((q, index) => 
                    createQuestion.mutateAsync({
                      ...q,
                      game_id: gameData.id,
                      order_index: index,
                    } as any)
                  );
                  
                  return Promise.all(createPromises);
                }).catch(error => {
                  console.error("Error updating questions:", error);
                  toast.error("Error al actualizar preguntas");
                });
              }}
            />
          </CardContent>
        </Card>
      )}

      {gameType === "column_match" && (
        <Card>
          <CardHeader>
            <CardTitle>Elementos de las Columnas</CardTitle>
            <CardDescription>Edita los elementos que los usuarios deben conectar</CardDescription>
          </CardHeader>
          <CardContent>
            <GameColumnMatchEditor
              leftItems={leftColumnItems}
              rightItems={rightColumnItems}
              onChange={(left, right) => {
                setLeftColumnItems(left);
                setRightColumnItems(right);
              }}
            />
          </CardContent>
        </Card>
      )}

      {gameType === "interactive_image" && (
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Imagen Interactiva</CardTitle>
            <CardDescription>Sube una imagen y define los puntos interactivos con sus preguntas</CardDescription>
          </CardHeader>
          <CardContent>
            <InteractiveImageEditor
              value={interactiveImageData}
              onChange={(v) => setInteractiveImageData(v)}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/profile")}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={updateGame.isPending}>
          {updateGame.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
};
