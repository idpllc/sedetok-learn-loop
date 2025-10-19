import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Info, Image, Video } from "lucide-react";
import { QuizQuestion } from "./QuizStep2";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ImageUpload } from "@/components/learning-paths/ImageUpload";

interface QuestionEditorProps {
  question: QuizQuestion;
  onChange: (question: QuizQuestion) => void;
}

export const QuestionEditor = ({ question, onChange }: QuestionEditorProps) => {
  const updateField = (field: string, value: any) => {
    // When changing question type, reset options to match new type
    if (field === "question_type") {
      let newOptions = [];
      
      if (value === "true_false") {
        newOptions = [
          { id: "true", option_text: "Verdadero", is_correct: false, order_index: 0 },
          { id: "false", option_text: "Falso", is_correct: false, order_index: 1 },
        ];
      } else if (value === "short_answer") {
        newOptions = [
          { id: "answer-1", option_text: "", is_correct: true, order_index: 0 },
        ];
      } else if (value === "multiple_choice") {
        newOptions = [
          { id: `opt-1`, option_text: "", is_correct: false, order_index: 0 },
          { id: `opt-2`, option_text: "", is_correct: false, order_index: 1 },
        ];
      }
      
      const updatedQuestion = {
        ...question,
        question_type: value,
        options: newOptions,
        comparison_mode: value === "short_answer" ? (question.comparison_mode || 'exact') : undefined,
      };
      onChange(updatedQuestion);
      return;
    }
    
    onChange({ ...question, [field]: value });
  };

  const addOption = () => {
    const newOption = {
      id: `opt-${Date.now()}`,
      option_text: "",
      is_correct: question.question_type === "short_answer",
      order_index: question.options.length,
    };
    updateField("options", [...question.options, newOption]);
  };

  const addShortAnswerOption = () => {
    const newAnswer = {
      id: `answer-${Date.now()}`,
      option_text: "",
      is_correct: true,
      order_index: question.options.length,
    };
    updateField("options", [...question.options, newAnswer]);
  };

  const updateOption = (index: number, field: string, value: any) => {
    const newOptions = [...question.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    
    // For true/false questions, only one can be correct
    if (field === "is_correct" && value === true && question.question_type === "true_false") {
      newOptions.forEach((opt, i) => {
        if (i !== index) opt.is_correct = false;
      });
    }
    
    updateField("options", newOptions);
  };

  const toggleMediaType = (index: number, type: 'image' | 'video') => {
    const newOptions = [...question.options];
    const option = newOptions[index];
    
    if (type === 'image') {
      option.showImageInput = !option.showImageInput;
      option.showVideoInput = false;
    } else {
      option.showVideoInput = !option.showVideoInput;
      option.showImageInput = false;
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
          <Label>Imagen de la pregunta (opcional)</Label>
          <ImageUpload
            value={question.image_url || ""}
            onChange={(url) => updateField("image_url", url)}
            label="Subir imagen"
          />
        </div>
        <div>
          <Label>Video de la pregunta (opcional)</Label>
          <ImageUpload
            value={question.video_url || ""}
            onChange={(url) => updateField("video_url", url)}
            label="Subir video"
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
              <div key={option.id} className="p-3 bg-muted rounded-lg space-y-3">
                <div className="flex items-center gap-3">
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
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => toggleMediaType(index, 'image')}
                    title="Agregar imagen"
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => toggleMediaType(index, 'video')}
                    title="Agregar video"
                  >
                    <Video className="h-4 w-4" />
                  </Button>
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

                {option.showImageInput && (
                  <div className="space-y-2">
                    <Label className="text-xs">Imagen de la opción</Label>
                    <ImageUpload
                      value={option.image_url || ""}
                      onChange={(url) => updateOption(index, "image_url", url)}
                    />
                  </div>
                )}

                {option.showVideoInput && (
                  <div className="space-y-2">
                    <Label className="text-xs">URL de video YouTube</Label>
                    <Input
                      value={option.video_url || ""}
                      onChange={(e) => updateOption(index, "video_url", e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                )}

                {option.image_url && !option.showImageInput && (
                  <img src={option.image_url} alt="Option" className="w-full h-24 object-cover rounded" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {question.question_type === "short_answer" && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Respuestas correctas *</Label>
              <Button size="sm" variant="outline" onClick={addShortAnswerOption}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar respuesta válida
              </Button>
            </div>
            
            <div className="space-y-2 mb-4">
              {question.options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <Input
                    value={option.option_text}
                    onChange={(e) => updateOption(index, "option_text", e.target.value)}
                    placeholder={`Respuesta válida ${index + 1}`}
                    className="flex-1"
                  />
                  {question.options.length > 1 && (
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
            
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-sm">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <p className="text-muted-foreground">
                Puedes agregar múltiples respuestas válidas. Ejemplo: "asociación", "asociación libre"
              </p>
            </div>
          </div>

          <div>
            <Label>Modo de comparación</Label>
            <Select
              value={question.comparison_mode || 'exact'}
              onValueChange={(value) => updateField("comparison_mode", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exact">Exacta (sin mayúsculas/minúsculas)</SelectItem>
                <SelectItem value="flexible">Flexible (tolerancia al 80%)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {question.comparison_mode === 'flexible' 
                ? 'Acepta respuestas con hasta 20% de diferencia'
                : 'Solo acepta respuestas exactas (sin distinguir mayúsculas)'}
            </p>
          </div>

          {/* Vista previa */}
          <Card className="p-4 border-dashed">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Vista previa:</p>
            <p className="text-sm mb-3">{question.question_text || "Texto de la pregunta..."}</p>
            <Input 
              placeholder="Escribe tu respuesta aquí..." 
              disabled 
              className="bg-background"
            />
          </Card>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label>Retroalimentación correcta (opcional)</Label>
          <Textarea
            value={question.feedback_correct || ""}
            onChange={(e) => updateField("feedback_correct", e.target.value)}
            placeholder="Mensaje que se mostrará al responder correctamente"
            rows={2}
          />
        </div>
        
        <div>
          <Label>Retroalimentación incorrecta (opcional)</Label>
          <Textarea
            value={question.feedback_incorrect || ""}
            onChange={(e) => updateField("feedback_incorrect", e.target.value)}
            placeholder="Mensaje que se mostrará al responder incorrectamente"
            rows={2}
          />
        </div>
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
