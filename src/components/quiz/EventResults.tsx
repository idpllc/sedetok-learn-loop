import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { useState } from "react";
import { UserResponsesDialog } from "./UserResponsesDialog";
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

// Conversion functions
const convertTo5Scale = (percentage: number): string => {
  return (percentage / 20).toFixed(1);
};

const convertTo10Scale = (percentage: number): string => {
  return (percentage / 10).toFixed(1);
};

const convertToQualitative = (percentage: number): string => {
  if (percentage < 20) return "Deficiente";
  if (percentage < 40) return "Insuficiente";
  if (percentage < 60) return "Aceptable";
  if (percentage < 80) return "Sobresaliente";
  return "Excelente";
};

const convertToPerformance = (percentage: number): string => {
  if (percentage < 20) return "Sin nivel";
  if (percentage < 40) return "Bajo";
  if (percentage < 60) return "Básico";
  if (percentage < 80) return "Alto";
  return "Superior";
};

const getQualitativeBadgeVariant = (percentage: number): "default" | "destructive" | "secondary" => {
  if (percentage < 40) return "destructive";
  if (percentage < 70) return "secondary";
  return "default";
};

interface EventResultsProps {
  results: any[];
  eventTitle: string;
  loading?: boolean;
  quizId?: string;
  gameId?: string;
  eventId: string;
}

export const EventResults = ({ results, eventTitle, loading, quizId, gameId, eventId }: EventResultsProps) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="text-center">Puntaje (0-100)</TableHead>
                <TableHead className="text-center">Escala 0-5</TableHead>
                <TableHead className="text-center">Escala 0-10</TableHead>
                <TableHead className="text-center">Cualitativa</TableHead>
                <TableHead className="text-center">Desempeño</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Tiempo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
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
                    <span className="font-medium">{convertTo5Scale(percentage)}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium">{convertTo10Scale(percentage)}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getQualitativeBadgeVariant(percentage)}>
                      {convertToQualitative(percentage)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getQualitativeBadgeVariant(percentage)}>
                      {convertToPerformance(percentage)}
                    </Badge>
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
                  <TableCell className="text-center">
                    {quizId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUserId(result.user_id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver respuestas
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
      </Card>

      {selectedUserId && (
        <UserResponsesDialog
          open={!!selectedUserId}
          onOpenChange={(open) => !open && setSelectedUserId(null)}
          userId={selectedUserId}
          quizId={quizId}
          gameId={gameId}
          eventId={eventId}
        />
      )}
    </div>
  );
};
