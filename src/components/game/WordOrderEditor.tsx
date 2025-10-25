import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { GameQuestion } from "@/hooks/useGames";
import { Textarea } from "@/components/ui/textarea";

interface WordOrderEditorProps {
  question: GameQuestion;
  onChange: (question: GameQuestion) => void;
}

export const WordOrderEditor = ({ question, onChange }: WordOrderEditorProps) => {
  const [newWord, setNewWord] = useState("");

  const updateField = (field: keyof GameQuestion, value: any) => {
    onChange({ ...question, [field]: value });
  };

  const addWord = () => {
    if (newWord.trim()) {
      const updatedWords = [...question.words, newWord.trim()];
      onChange({ ...question, words: updatedWords });
      setNewWord("");
    }
  };

  const removeWord = (index: number) => {
    const updatedWords = question.words.filter((_, i) => i !== index);
    onChange({ ...question, words: updatedWords });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addWord();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="question-text">Instrucción</Label>
        <Textarea
          id="question-text"
          value={question.question_text}
          onChange={(e) => updateField("question_text", e.target.value)}
          placeholder="Ej: Ordena las palabras para formar una oración correcta"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="correct-sentence">Oración Correcta</Label>
        <Input
          id="correct-sentence"
          value={question.correct_sentence}
          onChange={(e) => updateField("correct_sentence", e.target.value)}
          placeholder="Ej: Sarah doesn't like basketball"
        />
        <p className="text-xs text-muted-foreground">
          Esta será la respuesta correcta que el usuario debe formar
        </p>
      </div>

      <div className="space-y-2">
        <Label>Palabras para Ordenar</Label>
        <div className="flex gap-2">
          <Input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe una palabra"
          />
          <Button onClick={addWord} type="button">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Presiona Enter o el botón + para agregar cada palabra
        </p>
      </div>

      <div className="space-y-2">
        <Label>Lista de Palabras ({question.words.length})</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {question.words.map((word, index) => (
            <Card key={index} className="p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate">{word}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-destructive flex-shrink-0"
                  onClick={() => removeWord(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
        {question.words.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay palabras todavía
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="points">Puntos</Label>
        <Input
          id="points"
          type="number"
          min="1"
          value={question.points}
          onChange={(e) => updateField("points", parseInt(e.target.value) || 10)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="image-url">URL de Imagen (opcional)</Label>
        <Input
          id="image-url"
          value={question.image_url || ""}
          onChange={(e) => updateField("image_url", e.target.value)}
          placeholder="https://ejemplo.com/imagen.jpg"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="video-url">URL de Video (opcional)</Label>
        <Input
          id="video-url"
          value={question.video_url || ""}
          onChange={(e) => updateField("video_url", e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
        />
      </div>
    </div>
  );
};
