import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { QuizQuestion } from "./QuizStep2";

interface QuestionEditorProps {
  question: QuizQuestion;
  onChange: (question: QuizQuestion) => void;
}

export const QuestionEditor = ({ question, onChange }: QuestionEditorProps) => {
  const updateField = (field: string, value: any) => {
    onChange({ ...question, [field]: value });
  };

  const addOption = () => {
    const newOption = {
      id: `opt-${Date.now()}`,
      option_text: "",
      is_correct: false,
      order_index: question.options.length,
    };
    updateField("options", [...question.options, newOption]);
  };

  const updateOption = (index: number, field: string, value: any) => {
    const newOptions = [...question.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    
    // For single-choice questions, uncheck others when one is checked
    if (field === "is_correct" && value === true && question.question_type === "multiple_choice") {
      newOptions.forEach((opt, i) => {
        if (i !== index) opt.is_correct = false;
      });
    }
    
    updateField("options", newOptions);
  };

  const removeOption = (index: number) => {
    const newOptions = question.options.filter((_, i) => i !== index);
    updateField("options", newOptions);
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>Tipo de pregunta</Label>
        <Select
          value={question.question_type}
          onValueChange={(value) => updateField("question_type", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="multiple_choice">Selección múltiple</SelectItem>
            <SelectItem value="true_false">Verdadero / Falso</SelectItem>
            <SelectItem value="short_answer">Respuesta corta</SelectItem>
            <SelectItem value="matching">Relacionar columnas</SelectItem>
            <SelectItem value="ordering">Ordenar pasos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Enunciado de la pregunta *</Label>
        <Textarea
          value={question.question_text}
          onChange={(e) => updateField("question_text", e.target.value)}
          placeholder="Escribe tu pregunta aquí"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>URL de imagen (opcional)</Label>
          <Input
            value={question.image_url || ""}
            onChange={(e) => updateField("image_url", e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div>
          <Label>URL de video YouTube (opcional)</Label>
          <Input
            value={question.video_url || ""}
            onChange={(e) => updateField("video_url", e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>
      </div>

      {(question.question_type === "multiple_choice" || question.question_type === "true_false") && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <Label>Opciones</Label>
            {question.question_type === "multiple_choice" && (
              <Button size="sm" variant="outline" onClick={addOption}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar opción
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {question.options.map((option, index) => (
              <div key={option.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Switch
                  checked={option.is_correct}
                  onCheckedChange={(checked) => updateOption(index, "is_correct", checked)}
                />
                <Input
                  value={option.option_text}
                  onChange={(e) => updateOption(index, "option_text", e.target.value)}
                  placeholder={`Opción ${index + 1}`}
                  className="flex-1"
                />
                {question.question_type === "multiple_choice" && question.options.length > 2 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeOption(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {question.question_type === "short_answer" && (
        <div>
          <Label>Respuesta correcta</Label>
          <Input
            value={question.options[0]?.option_text || ""}
            onChange={(e) => updateOption(0, "option_text", e.target.value)}
            placeholder="Escribe la respuesta correcta"
          />
        </div>
      )}

      <div>
        <Label>Retroalimentación (opcional)</Label>
        <Textarea
          value={question.feedback || ""}
          onChange={(e) => updateField("feedback", e.target.value)}
          placeholder="Mensaje que se mostrará después de responder"
          rows={2}
        />
      </div>

      <div>
        <Label>Puntos</Label>
        <Input
          type="number"
          value={question.points}
          onChange={(e) => updateField("points", parseInt(e.target.value) || 10)}
          min={1}
          max={100}
        />
      </div>
    </div>
  );
};
