import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WordWheelQuestion {
  question_text: string;
  correct_sentence: string;
  initial_letter: string;
  points: number;
  order_index: number;
}

interface WordWheelEditorProps {
  question: WordWheelQuestion;
  onChange: (question: WordWheelQuestion) => void;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const WordWheelEditor = ({ question, onChange }: WordWheelEditorProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Letra Inicial *</Label>
        <Select
          value={question.initial_letter || "A"}
          onValueChange={(value) => onChange({ ...question, initial_letter: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una letra" />
          </SelectTrigger>
          <SelectContent>
            {ALPHABET.map((letter) => (
              <SelectItem key={letter} value={letter}>
                {letter}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          La respuesta debe empezar con esta letra
        </p>
      </div>

      <div className="space-y-2">
        <Label>Pregunta *</Label>
        <Textarea
          value={question.question_text}
          onChange={(e) => onChange({ ...question, question_text: e.target.value })}
          placeholder="Ej: Sentimiento que nos hace recordar momentos felices..."
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Describe la palabra que el usuario debe adivinar
        </p>
      </div>

      <div className="space-y-2">
        <Label>Respuesta Correcta *</Label>
        <Input
          value={question.correct_sentence}
          onChange={(e) => onChange({ ...question, correct_sentence: e.target.value })}
          placeholder="Ej: Nostalgia"
        />
        <p className="text-xs text-muted-foreground">
          La palabra o frase exacta que debe escribir el usuario
        </p>
      </div>

      <div className="space-y-2">
        <Label>Puntos</Label>
        <Input
          type="number"
          min="1"
          value={question.points}
          onChange={(e) => onChange({ ...question, points: parseInt(e.target.value) || 10 })}
        />
      </div>
    </div>
  );
};
