import { useState, useEffect, useRef } from "react";
import { CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/quiz/RichTextEditor";
import { OptionEditor } from "./OptionEditor";
import { useCloudinary } from "@/hooks/useCloudinary";
import { Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

interface QuestionData {
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

interface QuestionAccordionProps {
  questions: QuestionData[];
  onQuestionChange: (index: number, field: string, value: any) => void;
  onOptionChange: (qIndex: number, oIndex: number, field: 'text' | 'image_url', value: string) => void;
  onRemoveQuestion: (index: number) => void;
}

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

const getQuestionStatus = (q: QuestionData) => {
  const missing: string[] = [];
  if (!stripHtml(q.question_text)) missing.push("enunciado");
  const filledOptions = q.options.filter((o) => o.text.trim());
  if (filledOptions.length < 2) missing.push("opciones");
  if (!q.options[q.correct_answer]?.text?.trim()) missing.push("respuesta correcta");
  if (!q.feedback || !stripHtml(q.feedback)) missing.push("retroalimentación");
  return missing;
};

const QuestionImageUploader = ({ imageUrl, onImageChange }: { imageUrl?: string; onImageChange: (url: string) => void }) => {
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

export const QuestionAccordion = ({ questions, onQuestionChange, onOptionChange, onRemoveQuestion }: QuestionAccordionProps) => {
  const [openItems, setOpenItems] = useState<string[]>(() => 
    questions.map((_, i) => `q-${i}`)
  );
  const prevLengthRef = useRef(questions.length);

  useEffect(() => {
    if (questions.length > prevLengthRef.current) {
      const newKey = `q-${questions.length - 1}`;
      setOpenItems(prev => [...prev, newKey]);
    }
    prevLengthRef.current = questions.length;
  }, [questions.length]);

  return (
    <Accordion type="multiple" value={openItems} onValueChange={setOpenItems} className="space-y-2">
      {questions.map((q, qIndex) => {
        const missing = getQuestionStatus(q);
        const isComplete = missing.length === 0;
        return (
          <AccordionItem key={qIndex} value={`q-${qIndex}`} className="border rounded-lg px-4 overflow-hidden">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {isComplete ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                )}
                <span className="font-semibold text-sm truncate">
                  Pregunta {qIndex + 1}
                </span>
                {!isComplete && (
                  <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 dark:text-amber-400 shrink-0">
                    Falta: {missing.join(", ")}
                  </Badge>
                )}
                {isComplete && (
                  <Badge variant="outline" className="text-[10px] border-green-300 text-green-600 dark:text-green-400 shrink-0">
                    Completa
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" className="text-destructive h-8" onClick={() => onRemoveQuestion(qIndex)}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Eliminar
                </Button>
              </div>

              <div>
                <Label className="text-xs">Enunciado</Label>
                <RichTextEditor
                  content={q.question_text}
                  onChange={(val) => onQuestionChange(qIndex, "question_text", val)}
                  placeholder="Escribe la pregunta..."
                />
              </div>

              <QuestionImageUploader
                imageUrl={q.image_url}
                onImageChange={(url) => onQuestionChange(qIndex, "image_url", url)}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Puntos</Label>
                  <Input
                    type="number"
                    value={q.points}
                    onChange={(e) => onQuestionChange(qIndex, "points", parseInt(e.target.value) || 1000)}
                    min={100}
                    step={100}
                  />
                </div>
                <div>
                  <Label className="text-xs">Tiempo (seg)</Label>
                  <Input
                    type="number"
                    value={q.time_limit}
                    onChange={(e) => onQuestionChange(qIndex, "time_limit", parseInt(e.target.value) || 20)}
                    min={5}
                    max={120}
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
                        onChange={() => onQuestionChange(qIndex, "correct_answer", oIndex)}
                        className="shrink-0"
                      />
                      <OptionEditor
                        option={opt}
                        index={oIndex}
                        onTextChange={(val) => onOptionChange(qIndex, oIndex, "text", val)}
                        onImageChange={(val) => onOptionChange(qIndex, oIndex, "image_url", val)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs">Retroalimentación (opcional)</Label>
                <RichTextEditor
                  content={q.feedback || ""}
                  onChange={(val) => onQuestionChange(qIndex, "feedback", val)}
                  placeholder="Explicación de la respuesta correcta..."
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

export type { QuestionData };
