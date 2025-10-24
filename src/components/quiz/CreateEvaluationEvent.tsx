import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "lucide-react";
import { useEvaluationEvents } from "@/hooks/useEvaluationEvents";

interface CreateEvaluationEventProps {
  quizId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateEvaluationEvent = ({ quizId, open, onOpenChange }: CreateEvaluationEventProps) => {
  const { createEvent, isCreating } = useEvaluationEvents();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    require_authentication: true,
    allow_multiple_attempts: false,
    show_results_immediately: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.start_date || !formData.end_date) {
      return;
    }

    // Convert local datetime to ISO string with timezone
    const startDate = new Date(formData.start_date).toISOString();
    const endDate = new Date(formData.end_date).toISOString();

    createEvent({
      quiz_id: quizId,
      ...formData,
      start_date: startDate,
      end_date: endDate,
    });

    onOpenChange(false);
    setFormData({
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      require_authentication: true,
      allow_multiple_attempts: false,
      show_results_immediately: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear Evento de Evaluación</DialogTitle>
          <DialogDescription>
            Crea un evento para que otros usuarios puedan realizar este quiz en un período específico
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título del Evento *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: Evaluación Final - Matemáticas"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe el propósito de esta evaluación..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de Inicio *
              </Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="end_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de Finalización *
              </Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-4 border rounded-lg p-4">
            <h4 className="font-medium text-sm">Configuración</h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="require_auth">Requiere autenticación</Label>
                <p className="text-xs text-muted-foreground">
                  Los usuarios deben iniciar sesión para realizar el quiz
                </p>
              </div>
              <Switch
                id="require_auth"
                checked={formData.require_authentication}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, require_authentication: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow_multiple">Permitir múltiples intentos</Label>
                <p className="text-xs text-muted-foreground">
                  Los usuarios pueden realizar el quiz más de una vez
                </p>
              </div>
              <Switch
                id="allow_multiple"
                checked={formData.allow_multiple_attempts}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, allow_multiple_attempts: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show_results">Mostrar resultados inmediatamente</Label>
                <p className="text-xs text-muted-foreground">
                  Los usuarios verán su calificación al terminar
                </p>
              </div>
              <Switch
                id="show_results"
                checked={formData.show_results_immediately}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, show_results_immediately: checked })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creando..." : "Crear Evento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
