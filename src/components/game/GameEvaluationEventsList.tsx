import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, Copy, ExternalLink, Eye, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEvaluationEvents } from "@/hooks/useEvaluationEvents";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditEvaluationEvent } from "@/components/quiz/EditEvaluationEvent";
import { useNavigate } from "react-router-dom";

interface GameEvaluationEventsListProps {
  gameId?: string;
  status?: "all" | "active" | "finished";
}

export const GameEvaluationEventsList = ({ gameId, status = "all" }: GameEvaluationEventsListProps) => {
  const navigate = useNavigate();
  const { events, isLoading, deleteEvent } = useEvaluationEvents(undefined, gameId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const copyEventLink = (accessCode: string) => {
    const link = `${window.location.origin}/quiz-evaluation?code=${accessCode}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Enlace copiado",
      description: "El enlace del evento ha sido copiado al portapapeles",
    });
  };

  const openEventLink = (accessCode: string) => {
    const link = `${window.location.origin}/quiz-evaluation?code=${accessCode}`;
    window.open(link, "_blank");
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

  if (isLoading) {
    return <div className="text-center py-8">Cargando eventos...</div>;
  }

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No hay eventos de evaluación creados aún
        </CardContent>
      </Card>
    );
  }

  const filteredEvents = events.filter((event) => {
    if (status === "all") return true;
    const eventStatus = getEventStatus(event.start_date, event.end_date);
    if (status === "active") return eventStatus.label === "Activo";
    if (status === "finished") return eventStatus.label === "Finalizado";
    return true;
  });

  if (filteredEvents.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No hay eventos {status === "active" ? "activos" : "finalizados"}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {filteredEvents.map((event) => {
          const eventStatus = getEventStatus(event.start_date, event.end_date);

          return (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle>{event.title}</CardTitle>
                    <CardDescription>
                      {event.games?.title || "Juego"}
                    </CardDescription>
                  </div>
                  <Badge variant={eventStatus.variant}>{eventStatus.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.description && (
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Inicio:</span>
                    <span>{format(new Date(event.start_date), "PPP", { locale: es })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Fin:</span>
                    <span>{format(new Date(event.end_date), "PPP", { locale: es })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {event.access_code}
                  </Badge>
                  {event.require_authentication && <Badge variant="secondary">Requiere Auth</Badge>}
                  {event.allow_multiple_attempts && <Badge variant="secondary">Múltiples Intentos</Badge>}
                  {event.show_results_immediately && <Badge variant="secondary">Resultados Inmediatos</Badge>}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/quiz-evaluations/${event.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Resultados
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyEventLink(event.access_code)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Enlace
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEventLink(event.access_code)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir Enlace
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingEvent(event)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEventToDelete(event.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente el evento de
              evaluación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (eventToDelete) {
                  deleteEvent(eventToDelete);
                  setEventToDelete(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingEvent && (
        <EditEvaluationEvent
          event={editingEvent}
          open={!!editingEvent}
          onOpenChange={(open) => !open && setEditingEvent(null)}
        />
      )}
    </>
  );
};
