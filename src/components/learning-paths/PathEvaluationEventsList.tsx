import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Copy, ExternalLink, Share2, Trash2, Calendar, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useEvaluationEvents } from "@/hooks/useEvaluationEvents";
import { toast } from "sonner";

interface PathEvaluationEventsListProps {
  pathId: string;
}

export const PathEvaluationEventsList = ({ pathId }: PathEvaluationEventsListProps) => {
  const navigate = useNavigate();
  const { events, isLoading, deleteEvent } = useEvaluationEvents(undefined, undefined, pathId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  const copyEventLink = (accessCode: string) => {
    const link = `${window.location.origin}/path-evaluation/${accessCode}`;
    navigator.clipboard.writeText(link);
    toast.success("Enlace copiado al portapapeles");
  };

  const openEventLink = (accessCode: string) => {
    window.open(`${window.location.origin}/path-evaluation/${accessCode}`, "_blank");
  };

  const getEventStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      return { label: "Programado", variant: "secondary" as const };
    } else if (now >= start && now <= end) {
      return { label: "Activo", variant: "default" as const };
    } else {
      return { label: "Finalizado", variant: "outline" as const };
    }
  };

  const handleDelete = () => {
    if (!eventToDelete) return;

    deleteEvent.mutate(eventToDelete, {
      onSuccess: () => {
        toast.success("Evento eliminado exitosamente");
        setDeleteDialogOpen(false);
        setEventToDelete(null);
      },
      onError: (error) => {
        console.error("Error deleting event:", error);
        toast.error("Error al eliminar el evento");
      },
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando eventos...</div>;
  }

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No hay eventos de evaluación para esta ruta
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {events.map((event) => {
          const status = getEventStatus(event.start_date, event.end_date);

          return (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle>{event.title}</CardTitle>
                    {event.description && (
                      <CardDescription>{event.description}</CardDescription>
                    )}
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Inicio:</span>
                    <span>{format(new Date(event.start_date), "PPP", { locale: es })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Fin:</span>
                    <span>{format(new Date(event.end_date), "PPP", { locale: es })}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {event.require_authentication && (
                    <Badge variant="outline">Requiere autenticación</Badge>
                  )}
                  {event.allow_multiple_attempts && (
                    <Badge variant="outline">Múltiples intentos</Badge>
                  )}
                  {event.show_results_immediately && (
                    <Badge variant="outline">Resultados inmediatos</Badge>
                  )}
                </div>

                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm font-medium mb-1">Código de acceso:</p>
                  <p className="text-lg font-mono font-bold">{event.access_code}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/path-evaluation/${event.access_code}/results`)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Ver Resultados
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyEventLink(event.access_code)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Enlace
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEventLink(event.access_code)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEventToDelete(event.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el evento de evaluación
              y todos los resultados asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
