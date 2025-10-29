import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Users, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { usePathEvaluationResults } from "@/hooks/usePathEvaluationResults";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PathEvaluationResults() {
  const { accessCode } = useParams();
  const navigate = useNavigate();

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["evaluation-event-by-code", accessCode],
    queryFn: async () => {
      if (!accessCode) throw new Error("Access code is required");

      const { data, error } = await supabase.rpc("get_evaluation_event_by_code", {
        p_access_code: accessCode,
      });

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Event not found");

      return data[0];
    },
    enabled: !!accessCode,
  });

  const { results, isLoading: resultsLoading } = usePathEvaluationResults(event?.id);

  const { data: pathData } = useQuery({
    queryKey: ["learning-path", event?.path_id],
    queryFn: async () => {
      if (!event?.path_id) return null;

      const { data, error } = await supabase
        .from("learning_paths")
        .select("*")
        .eq("id", event.path_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!event?.path_id,
  });

  const exportToCSV = () => {
    if (!results || results.length === 0) return;

    const headers = ["Estudiante", "Username", "Items Completados", "Total Items", "Porcentaje", "Estado", "Fecha Inicio", "Fecha Completado"];
    const rows = results.map((result) => [
      result.profiles?.full_name || "Sin nombre",
      result.profiles?.username || "N/A",
      result.completed_items,
      result.total_items,
      `${result.completion_percentage}%`,
      result.passed ? "Completado" : "En progreso",
      format(new Date(result.started_at), "PPP", { locale: es }),
      result.completed_at ? format(new Date(result.completed_at), "PPP", { locale: es }) : "En progreso",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `resultados_${event?.title || "evaluacion"}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (eventLoading || resultsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-32 mb-8" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Evento no encontrado</CardTitle>
            <CardDescription>
              El código de acceso proporcionado no es válido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")}>Volver al inicio</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedCount = results?.filter((r) => r.passed).length || 0;
  const inProgressCount = results?.filter((r) => !r.passed).length || 0;
  const averageCompletion =
    results && results.length > 0
      ? results.reduce((sum, r) => sum + r.completion_percentage, 0) / results.length
      : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
          <p className="text-muted-foreground">
            Resultados de evaluación - {pathData?.title || "Cargando..."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Participantes
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{results?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completados
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCount}</div>
              <p className="text-xs text-muted-foreground">
                {inProgressCount} en progreso
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Promedio de Completamiento
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {averageCompletion.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Resultados de Estudiantes</CardTitle>
                <CardDescription>
                  Progreso detallado de cada participante
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={exportToCSV}
                disabled={!results || results.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!results || results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay participantes aún
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estudiante</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Completamiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Inicio</TableHead>
                    <TableHead>Fecha Completado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={result.profiles?.avatar_url} />
                            <AvatarFallback>
                              {result.profiles?.full_name?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {result.profiles?.full_name || "Sin nombre"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @{result.profiles?.username || "N/A"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {result.completed_items} / {result.total_items}
                      </TableCell>
                      <TableCell>{result.completion_percentage}%</TableCell>
                      <TableCell>
                        <Badge variant={result.passed ? "default" : "secondary"}>
                          {result.passed ? "Completado" : "En progreso"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(result.started_at), "PPP", {
                          locale: es,
                        })}
                      </TableCell>
                      <TableCell>
                        {result.completed_at
                          ? format(new Date(result.completed_at), "PPP", {
                              locale: es,
                            })
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
