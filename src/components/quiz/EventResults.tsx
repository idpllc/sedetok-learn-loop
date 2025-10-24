import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EventResultsProps {
  results: any[];
  eventTitle: string;
  loading?: boolean;
}

export const EventResults = ({ results, eventTitle, loading }: EventResultsProps) => {
  const exportToCSV = () => {
    const headers = ["Usuario", "Nombre", "Documento", "Puntaje", "Puntaje Máximo", "Aprobado", "Tiempo (min)", "Fecha"];
    const rows = results.map((result) => [
      result.profiles?.username || "N/A",
      result.profiles?.full_name || "N/A",
      result.no_documento || result.profiles?.numero_documento || "N/A",
      result.score,
      result.max_score,
      result.passed ? "Sí" : "No",
      result.time_taken ? Math.round(result.time_taken / 60) : "N/A",
      format(new Date(result.completed_at), "dd/MM/yyyy HH:mm", { locale: es }),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `resultados_${eventTitle.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          Aún no hay resultados para este evento de evaluación.
        </p>
      </Card>
    );
  }

  const averageScore = results.reduce((sum, r) => sum + (r.score / r.max_score) * 100, 0) / results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const passRate = (passedCount / results.length) * 100;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Participantes</p>
            <p className="text-2xl font-bold">{results.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Promedio</p>
            <p className="text-2xl font-bold">{averageScore.toFixed(1)}%</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Aprobados</p>
            <p className="text-2xl font-bold">
              {passedCount} ({passRate.toFixed(0)}%)
            </p>
          </Card>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead className="text-center">Puntaje</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-center">Tiempo</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => {
              const percentage = (result.score / result.max_score) * 100;
              return (
                <TableRow key={result.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={result.profiles?.avatar_url} />
                        <AvatarFallback>
                          {result.profiles?.full_name?.[0] || result.profiles?.username?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{result.profiles?.full_name || "Usuario"}</p>
                        <p className="text-xs text-muted-foreground">@{result.profiles?.username || "N/A"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {result.no_documento || result.profiles?.numero_documento || "N/A"}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      <p className="font-semibold">
                        {result.score} / {result.max_score}
                      </p>
                      <Badge variant={percentage >= 70 ? "default" : "destructive"}>
                        {percentage.toFixed(0)}%
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {result.passed ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Aprobado
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="w-3 h-3" />
                        Reprobado
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {result.time_taken ? (
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <Clock className="w-3 h-3" />
                        {Math.round(result.time_taken / 60)} min
                      </div>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(result.completed_at), "dd MMM yyyy, HH:mm", { locale: es })}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
