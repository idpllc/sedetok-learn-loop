import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Copy, ExternalLink, Trash2, Users, Clock, BarChart3, Pencil, Share2 } from "lucide-react";
import { useEvaluationEvents } from "@/hooks/useEvaluationEvents";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { ShareEventSheet } from "@/components/ShareEventSheet";
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
import { EditEvaluationEvent } from "./EditEvaluationEvent";
interface EvaluationEventsListProps {
  quizId?: string;
  status?: "all" | "active" | "finished";
}

export const EvaluationEventsList = ({ quizId, status = "all" }: EvaluationEventsListProps) => {
  const { events, isLoading, deleteEvent } = useEvaluationEvents(quizId);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [editEvent, setEditEvent] = useState<any | null>(null);
  const navigate = useNavigate();

  const copyEventLink = (accessCode: string) => {
    const link = `${window.location.origin}/quiz-evaluation/${accessCode}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado",
      description: "El link de evaluación ha sido copiado al portapapeles",
    });
  };

  const openEventLink = (accessCode: string) => {
    window.open(`/quiz-evaluation/${accessCode}`, "_blank");
  };

  const getEventStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      return { status: "Programado", variant: "secondary" as const };
    } else if (now > end) {
      return { status: "Finalizado", variant: "outline" as const };
    } else {
      return { status: "Activo", variant: "default" as const };
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando eventos...</div>;
  }

  // Filter events by status
  const filteredEvents = events?.filter((event: any) => {
    if (status === "all") return true;
    
    const now = new Date();
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    
    if (status === "active") {
      return now >= start && now <= end;
    } else if (status === "finished") {
      return now > end;
    }
    
    return true;
  }) || [];

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay eventos de evaluación creados
      </div>
    );
  }

  if (filteredEvents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay eventos {status === "active" ? "activos" : status === "finished" ? "finalizados" : ""} en este momento
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredEvents.map((event: any) => {
        const { status, variant } = getEventStatus(event.start_date, event.end_date);
        
        return (
          <Card key={event.id} className="p-4">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{event.title}</h3>
                    {event.quizzes?.title && (
                      <p className="text-sm text-muted-foreground">
                        Quiz: {event.quizzes.title}
                      </p>
                    )}
                  </div>
                  <Badge variant={variant}>{status}</Badge>
                </div>

                {event.description && (
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Inicio: {format(new Date(event.start_date), "dd MMM yyyy, HH:mm", { locale: es })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Fin: {format(new Date(event.end_date), "dd MMM yyyy, HH:mm", { locale: es })}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span>Creado: {format(new Date(event.created_at), "dd MMM yyyy", { locale: es })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="outline" className="font-mono">
                    {event.access_code}
                  </Badge>
                  <ShareEventSheet
                    accessCode={event.access_code}
                    eventTitle={event.title}
                    eventType="quiz"
                    trigger={
                      <Button size="sm" variant="ghost">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/quiz-evaluations/results/${event.id}`)}
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyEventLink(event.access_code)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEventLink(event.access_code)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-2 text-xs">
                  {event.require_authentication && (
                    <Badge variant="secondary">Requiere autenticación</Badge>
                  )}
                  {event.allow_multiple_attempts && (
                    <Badge variant="secondary">Múltiples intentos</Badge>
                  )}
                  {event.show_results_immediately && (
                    <Badge variant="secondary">Resultados inmediatos</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditEvent(event)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteEventId(event.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}

      <AlertDialog open={!!deleteEventId} onOpenChange={() => setDeleteEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el evento pero los resultados ya registrados se mantendrán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteEventId) {
                  deleteEvent(deleteEventId);
                  setDeleteEventId(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editEvent && (
        <EditEvaluationEvent
          event={editEvent}
          open={!!editEvent}
          onOpenChange={(o) => {
            if (!o) setEditEvent(null);
          }}
        />
      )}
    </div>
  );
};
