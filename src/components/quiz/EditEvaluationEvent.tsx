import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "lucide-react";
import { useEvaluationEvents } from "@/hooks/useEvaluationEvents";

interface EditEvaluationEventProps {
  event: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const toLocalInputValue = (dateStr: string) => {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const EditEvaluationEvent = ({ event, open, onOpenChange }: EditEvaluationEventProps) => {
  const { updateEvent } = useEvaluationEvents();

  const initialState = useMemo(() => ({
    title: event?.title ?? "",
    description: event?.description ?? "",
    start_date: event?.start_date ? toLocalInputValue(event.start_date) : "",
    end_date: event?.end_date ? toLocalInputValue(event.end_date) : "",
    require_authentication: !!event?.require_authentication,
    allow_multiple_attempts: !!event?.allow_multiple_attempts,
    show_results_immediately: !!event?.show_results_immediately,
  }), [event]);

  const [formData, setFormData] = useState(initialState);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event?.id) return;

    const startDate = formData.start_date ? new Date(formData.start_date).toISOString() : undefined;
    const endDate = formData.end_date ? new Date(formData.end_date).toISOString() : undefined;

    updateEvent({
      id: event.id,
      title: formData.title,
      description: formData.description,
      start_date: startDate as any,
      end_date: endDate as any,
      require_authentication: formData.require_authentication,
      allow_multiple_attempts: formData.allow_multiple_attempts,
      show_results_immediately: formData.show_results_immediately,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Evento de Evaluación</DialogTitle>
          <DialogDescription>
            Actualiza la información del evento. Los cambios aplican de inmediato.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título del Evento *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de Inicio
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
                Fecha de Finalización
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
            <Button type="submit">
              Guardar cambios
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditEvaluationEvent;
