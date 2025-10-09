import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuizQuestion } from "./QuizStep2";

interface QuizStep3Props {
  formData: {
    time_limit?: number;
    random_order: boolean;
    final_message: string;
  };
  questions: QuizQuestion[];
  onChange: (field: string, value: any) => void;
}

export const QuizStep3 = ({ formData, questions, onChange }: QuizStep3Props) => {
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resumen del Quiz</CardTitle>
          <CardDescription>Revisa la información antes de publicar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total de preguntas</p>
              <p className="text-2xl font-bold">{questions.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Puntos totales</p>
              <p className="text-2xl font-bold">{totalPoints}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <Label htmlFor="time_limit">Tiempo límite (minutos, opcional)</Label>
        <Input
          id="time_limit"
          type="number"
          value={formData.time_limit || ""}
          onChange={(e) => onChange("time_limit", e.target.value ? parseInt(e.target.value) : undefined)}
          placeholder="Sin límite de tiempo"
          min={1}
        />
        <p className="text-sm text-muted-foreground mt-1">
          Deja vacío para no establecer límite de tiempo
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Orden aleatorio de preguntas</Label>
          <p className="text-sm text-muted-foreground">
            Las preguntas se mostrarán en orden diferente cada vez
          </p>
        </div>
        <Switch
          checked={formData.random_order}
          onCheckedChange={(checked) => onChange("random_order", checked)}
        />
      </div>

      <div>
        <Label htmlFor="final_message">Mensaje final personalizado</Label>
        <Textarea
          id="final_message"
          value={formData.final_message}
          onChange={(e) => onChange("final_message", e.target.value)}
          placeholder="¡Excelente trabajo! Has completado el quiz."
          rows={3}
        />
        <p className="text-sm text-muted-foreground mt-1">
          Este mensaje se mostrará al completar el quiz
        </p>
      </div>

      <Card className="bg-muted">
        <CardHeader>
          <CardTitle className="text-lg">Vista previa de preguntas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {questions.map((q, index) => (
              <div key={q.id} className="p-3 bg-background rounded-lg">
                <p className="font-medium">
                  {index + 1}. {q.question_text || "Sin título"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tipo: {q.question_type} • {q.points} puntos
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
