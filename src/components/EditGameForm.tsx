import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { GameColumnMatchEditor } from "@/components/game/GameColumnMatchEditor";
import { WordOrderEditor } from "@/components/game/WordOrderEditor";
import { useGames, useGameQuestions, GameQuestion } from "@/hooks/useGames";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface EditGameFormProps {
  gameData: any;
}

export const EditGameForm = ({ gameData }: EditGameFormProps) => {
  const navigate = useNavigate();
  const { updateGame } = useGames();
  const { questions, isLoading: questionsLoading, createQuestion, deleteQuestion } = useGameQuestions(gameData.id);
  
  const [title, setTitle] = useState(gameData.title || "");
  const [description, setDescription] = useState(gameData.description || "");
  const [category, setCategory] = useState(gameData.category || "");
  const [gradeLevel, setGradeLevel] = useState(gameData.grade_level || "");
  const [subject, setSubject] = useState(gameData.subject || "");
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
  
  // New question being added
  const [newQuestion, setNewQuestion] = useState<GameQuestion | null>(null);

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
      subject,
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
      await updateGame.mutateAsync({ id: gameData.id, updates });
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
              <Label htmlFor="category">Categoría *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Matematicas">Matemáticas</SelectItem>
                  <SelectItem value="Ciencias">Ciencias</SelectItem>
                  <SelectItem value="Lenguaje">Lenguaje</SelectItem>
                  <SelectItem value="Sociales">Sociales</SelectItem>
                  <SelectItem value="Ingles">Inglés</SelectItem>
                  <SelectItem value="Arte">Arte</SelectItem>
                  <SelectItem value="Deportes">Deportes</SelectItem>
                  <SelectItem value="Tecnologia">Tecnología</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">Nivel *</Label>
              <Select value={gradeLevel} onValueChange={setGradeLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Primaria">Primaria</SelectItem>
                  <SelectItem value="Secundaria">Secundaria</SelectItem>
                  <SelectItem value="Bachillerato">Bachillerato</SelectItem>
                  <SelectItem value="Universidad">Universidad</SelectItem>
                  <SelectItem value="Todos">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Materia</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej: Álgebra, Biología, etc."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gameType">Tipo de Juego</Label>
              <Select value={gameType} onValueChange={setGameType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="word_order">Ordenar Palabras</SelectItem>
                  <SelectItem value="column_match">Conectar Columnas</SelectItem>
                </SelectContent>
              </Select>
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
                {questions.map((q: any, index: number) => (
                  <Card key={q.id} className="border-2">
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Add new question form */}
            {!newQuestion ? (
              <Button onClick={() => setNewQuestion({
                question_text: "",
                correct_sentence: "",
                words: [],
                points: 10,
                order_index: questions?.length || 0,
              })} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Nueva Pregunta
              </Button>
            ) : (
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
