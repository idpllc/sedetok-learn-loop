import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Trash2, Save, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/quiz/RichTextEditor";
import { OptionEditor } from "@/components/live-games/OptionEditor";
import { useCloudinary } from "@/hooks/useCloudinary";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditableQuestion {
  id?: string;
  question_text: string;
  question_type: string;
  options: Array<{ text: string; image_url?: string }>;
  correct_answer: number;
  points: number;
  time_limit: number;
  order_index: number;
  image_url?: string;
  video_url?: string;
  feedback?: string;
}

const QuestionImageUploader = ({
  imageUrl,
  onImageChange,
}: {
  imageUrl?: string;
  onImageChange: (url: string) => void;
}) => {
  const { uploadFile, uploading } = useCloudinary();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile(file, "image");
      onImageChange(url);
      toast.success("Imagen agregada");
    } catch {
      toast.error("No se pudo subir la imagen");
    }
  };

  return (
    <div className="space-y-2">
      <input type="file" ref={fileInputRef} onChange={handleUpload} accept="image/*" className="hidden" />
      {imageUrl ? (
        <div className="relative w-full h-32 rounded-lg overflow-hidden border">
          <img src={imageUrl} alt="Imagen de la pregunta" className="w-full h-full object-cover" />
          <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => onImageChange("")}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <ImageIcon className="w-4 h-4 mr-2" />
          {uploading ? "Subiendo..." : "Agregar imagen"}
        </Button>
      )}
    </div>
  );
};

const EditLiveGame = () => {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gameStatus, setGameStatus] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchGame = async () => {
      if (!gameId || !user) return;
      try {
        const { data: gameData, error: gameError } = await supabase
          .from("live_games")
          .select("*")
          .eq("id", gameId)
          .single();

        if (gameError) throw gameError;
        if (gameData.creator_id !== user.id) {
          toast.error("No tienes permiso para editar este juego");
          navigate("/live-games");
          return;
        }

        setTitle(gameData.title);
        setGameStatus(gameData.status);

        const { data: qData, error: qError } = await supabase
          .from("live_game_questions")
          .select("*")
          .eq("game_id", gameId)
          .order("order_index", { ascending: true });

        if (qError) throw qError;

        setQuestions(
          (qData || []).map((q) => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options as Array<{ text: string; image_url?: string }>,
            correct_answer: q.correct_answer,
            points: q.points,
            time_limit: q.time_limit,
            order_index: q.order_index,
            image_url: q.image_url || undefined,
            video_url: q.video_url || undefined,
            feedback: q.feedback || undefined,
          }))
        );
      } catch (error) {
        console.error("Error fetching game:", error);
        toast.error("Error al cargar el juego");
        navigate("/live-games");
      } finally {
        setLoading(false);
      }
    };

    if (user && gameId) fetchGame();
  }, [gameId, user, navigate]);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
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
        order_index: questions.length,
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, field: 'text' | 'image_url', value: string) => {
    const updated = [...questions];
    const options = [...updated[qIndex].options];
    options[oIndex] = { ...options[oIndex], [field]: value };
    updated[qIndex] = { ...updated[qIndex], options };
    setQuestions(updated);
  };

  const handleSave = async () => {
    if (!gameId || !title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    if (questions.length === 0) {
      toast.error("Agrega al menos una pregunta");
      return;
    }

    setSaving(true);
    try {
      // Update game title
      const { error: gameError } = await supabase
        .from("live_games")
        .update({ title })
        .eq("id", gameId);
      if (gameError) throw gameError;

      // Delete existing questions
      const { error: deleteError } = await supabase
        .from("live_game_questions")
        .delete()
        .eq("game_id", gameId);
      if (deleteError) throw deleteError;

      // Insert updated questions
      const questionsToInsert = questions.map((q, index) => ({
        game_id: gameId,
        question_text: q.question_text,
        question_type: q.question_type || "multiple_choice",
        options: q.options.map((opt) => ({
          text: opt.text || "",
          image_url: opt.image_url || "",
        })),
        correct_answer: q.correct_answer,
        points: q.points || 1000,
        time_limit: q.time_limit || 20,
        order_index: index,
        ...(q.image_url && { image_url: q.image_url }),
        ...(q.video_url && { video_url: q.video_url }),
        ...(q.feedback && { feedback: q.feedback }),
      }));

      const { error: insertError } = await supabase
        .from("live_game_questions")
        .insert(questionsToInsert);
      if (insertError) throw insertError;

      toast.success("Juego actualizado exitosamente");
      navigate(`/live-games/host/${gameId}`);
    } catch (error: any) {
      console.error("Error saving game:", error);
      toast.error(error.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/live-games")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold flex-1">Editar Juego en Vivo</h1>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {gameStatus !== "waiting" && (
          <Card className="p-4 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Este juego ya fue utilizado. Los cambios que hagas aplicarán para la próxima vez que lo uses.
            </p>
          </Card>
        )}

        <div>
          <Label htmlFor="title">Título del Juego</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del juego" />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Preguntas ({questions.length})</h2>
            <Button onClick={handleAddQuestion} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1.5" />
              Agregar
            </Button>
          </div>

          {questions.map((q, qIndex) => (
            <Card key={qIndex} className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Pregunta {qIndex + 1}</h3>
                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleRemoveQuestion(qIndex)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div>
                <Label className="text-xs">Enunciado</Label>
                <RichTextEditor
                  content={q.question_text}
                  onChange={(val) => handleQuestionChange(qIndex, "question_text", val)}
                  placeholder="Escribe la pregunta..."
                />
              </div>

              <QuestionImageUploader
                imageUrl={q.image_url}
                onImageChange={(url) => handleQuestionChange(qIndex, "image_url", url)}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Puntos</Label>
                  <Input
                    type="number"
                    value={q.points}
                    onChange={(e) => handleQuestionChange(qIndex, "points", parseInt(e.target.value) || 1000)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Tiempo (seg)</Label>
                  <Input
                    type="number"
                    value={q.time_limit}
                    onChange={(e) => handleQuestionChange(qIndex, "time_limit", parseInt(e.target.value) || 20)}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-2 block">Opciones de respuesta</Label>
                <div className="space-y-2">
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={q.correct_answer === oIndex}
                        onChange={() => handleQuestionChange(qIndex, "correct_answer", oIndex)}
                        className="shrink-0"
                      />
                      <OptionEditor
                        option={opt}
                        index={oIndex}
                        onTextChange={(val) => handleOptionChange(qIndex, oIndex, "text", val)}
                        onImageChange={(val) => handleOptionChange(qIndex, oIndex, "image_url", val)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs">Retroalimentación (opcional)</Label>
                <RichTextEditor
                  content={q.feedback || ""}
                  onChange={(val) => handleQuestionChange(qIndex, "feedback", val)}
                  placeholder="Explicación de la respuesta correcta..."
                />
              </div>
            </Card>
          ))}

          {questions.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground text-sm mb-3">No hay preguntas</p>
              <Button onClick={handleAddQuestion} size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Agregar primera pregunta
              </Button>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default EditLiveGame;
