import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QuestionAccordion, QuestionData } from "@/components/live-games/QuestionAccordion";

const createDraftId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const EditLiveGame = () => {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gameStatus, setGameStatus] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchGame = async () => {
      if (!gameId || !user) return;
      try {
        const { data: gameData, error: gameError } = await supabase
          .from("live_games").select("*").eq("id", gameId).single();
        if (gameError) throw gameError;
        if (gameData.creator_id !== user.id) {
          toast.error("No tienes permiso para editar este juego");
          navigate("/live-games");
          return;
        }
        setTitle(gameData.title);
        setGameStatus(gameData.status);

        const { data: qData, error: qError } = await supabase
          .from("live_game_questions").select("*").eq("game_id", gameId)
          .order("order_index", { ascending: true });
        if (qError) throw qError;

        setQuestions(
          (qData || []).map((q) => ({
            id: q.id,
            local_id: q.id,
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
    setQuestions((prev) => [
      ...prev,
      {
        local_id: createDraftId(),
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
        order_index: prev.length,
        feedback: "",
      },
    ]);
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    setQuestions((prev) => {
      if (!prev[index]) return prev;
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleOptionChange = (qIndex: number, oIndex: number, field: 'text' | 'image_url', value: string) => {
    setQuestions((prev) => {
      if (!prev[qIndex]) return prev;
      const updated = [...prev];
      const options = [...updated[qIndex].options];
      options[oIndex] = { ...options[oIndex], [field]: value };
      updated[qIndex] = { ...updated[qIndex], options };
      return updated;
    });
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!gameId || !title.trim()) { toast.error("El título es obligatorio"); return; }
    if (questions.length === 0) { toast.error("Agrega al menos una pregunta"); return; }
    setSaving(true);
    try {
      const { error: gameError } = await supabase.from("live_games").update({ title }).eq("id", gameId);
      if (gameError) throw gameError;
      const { error: deleteError } = await supabase.from("live_game_questions").delete().eq("game_id", gameId);
      if (deleteError) throw deleteError;

      const questionsToInsert = questions.map((q, index) => ({
        game_id: gameId, question_text: q.question_text, question_type: q.question_type || "multiple_choice",
        options: q.options.map((opt) => ({ text: opt.text || "", image_url: opt.image_url || "" })),
        correct_answer: q.correct_answer, points: q.points || 1000, time_limit: q.time_limit || 20, order_index: index,
        ...(q.image_url && { image_url: q.image_url }),
        ...(q.video_url && { video_url: q.video_url }),
        ...(q.feedback && { feedback: q.feedback }),
      }));

      const { error: insertError } = await supabase.from("live_game_questions").insert(questionsToInsert);
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
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
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
              ⚠️ Este juego ya fue utilizado. Los cambios aplicarán para la próxima vez que lo uses.
            </p>
          </Card>
        )}

        <div>
          <Label htmlFor="title">Título del Juego</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del juego" />
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold">Preguntas ({questions.length})</h2>

          <QuestionAccordion
            questions={questions}
            onQuestionChange={handleQuestionChange}
            onOptionChange={handleOptionChange}
            onRemoveQuestion={handleRemoveQuestion}
          />

          {questions.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground text-sm mb-3">No hay preguntas</p>
              <Button onClick={handleAddQuestion} size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Agregar primera pregunta
              </Button>
            </Card>
          )}

          <Button onClick={handleAddQuestion} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-1.5" />
            Agregar Pregunta
          </Button>
        </div>
      </main>
    </div>
  );
};

export default EditLiveGame;
