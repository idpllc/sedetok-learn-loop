import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, FileText, Link as LinkIcon, GraduationCap, Type, Video } from "lucide-react";
import { useS3Upload } from "@/hooks/useS3Upload";
import { useNotebookSources } from "@/hooks/useNotebooks";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

interface AddSourceDialogProps {
  open: boolean;
  onClose: () => void;
  notebookId: string;
}

const guessType = (file: File): "pdf" | "docx" | "xlsx" | null => {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx") || name.endsWith(".doc")) return "docx";
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) return "xlsx";
  return null;
};

export const AddSourceDialog = ({ open, onClose, notebookId }: AddSourceDialogProps) => {
  const { uploadFile, uploading } = useS3Upload();
  const { ingest } = useNotebookSources(notebookId);
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("file");

  // Text source
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");

  // URL source
  const [url, setUrl] = useState("");

  // Video source
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");

  const reset = () => {
    setTextTitle("");
    setTextContent("");
    setUrl("");
    setVideoUrl("");
    setVideoTitle("");
  };

  const handleClose = () => {
    if (uploading || ingest.isPending) return;
    reset();
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = guessType(file);
    if (!type) {
      toast({ title: "Formato no soportado", description: "Usa PDF, DOCX, XLSX o CSV", variant: "destructive" });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "Archivo muy grande", description: "Máximo 25 MB", variant: "destructive" });
      return;
    }
    try {
      const fileUrl = await uploadFile(file, "document");
      await ingest.mutateAsync({
        sourceType: type,
        title: file.name,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
      handleClose();
    } catch (err: any) {
      toast({ title: "Error", description: String(err?.message || err), variant: "destructive" });
    } finally {
      e.target.value = "";
    }
  };

  const handleAddText = async () => {
    if (!textContent.trim()) return;
    await ingest.mutateAsync({
      sourceType: "text",
      title: textTitle.trim() || "Texto pegado",
      textContent,
    });
    handleClose();
  };

  const handleAddUrl = async () => {
    if (!url.trim()) return;
    await ingest.mutateAsync({
      sourceType: "url",
      title: url,
      fileUrl: url,
    });
    handleClose();
  };

  const handleAddVideo = async () => {
    if (!videoUrl.trim()) return;
    await ingest.mutateAsync({
      sourceType: "video",
      title: videoTitle.trim() || videoUrl,
      fileUrl: videoUrl,
    });
    handleClose();
  };

  // Competence picker — load study plans for current user
  const { data: studyPlans } = useQuery({
    queryKey: ["my-study-plans", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("student_study_plans")
        .select("id, academic_year, grade, periodos")
        .eq("user_id", user.id)
        .order("academic_year", { ascending: false });
      return data || [];
    },
    enabled: !!user && open && tab === "competence",
  });

  const getAsignaturaName = (a: any) =>
    a?.nombre_asignatura || a?.nombre || "Asignatura sin nombre";
  const getPeriodoName = (p: any, i: number) =>
    p?.periodo_nombre || p?.nombre || `Periodo ${p?.numero || i + 1}`;
  const getCompetenciaName = (c: any) =>
    c?.nombre_competencia || c?.nombre || c?.descripcion || "Competencia";
  const getCompetenciaNota = (c: any) =>
    c?.calificacion_competencia ?? c?.nota;

  const handleAddCompetence = async (planId: string, periodoIdx: number, asignaturaIdx: number, compIdx: number) => {
    const plan = studyPlans?.find((p: any) => p.id === planId);
    if (!plan) return;
    const periodo = plan.periodos?.[periodoIdx];
    const asignatura = periodo?.asignaturas?.[asignaturaIdx];
    const comp = asignatura?.competencias?.[compIdx];
    if (!comp) return;

    const asignaturaNombre = getAsignaturaName(asignatura);
    const periodoNombre = getPeriodoName(periodo, periodoIdx);
    const competenciaNombre = getCompetenciaName(comp);
    const nota = getCompetenciaNota(comp);

    const lines: string[] = [];
    lines.push(`Asignatura: ${asignaturaNombre}`);
    lines.push(`Periodo: ${periodoNombre}`);
    lines.push(`Grado: ${plan.grade}  |  Año: ${plan.academic_year}`);
    lines.push(`\nCompetencia: ${competenciaNombre}`);
    if (comp.descripcion && comp.descripcion !== competenciaNombre) {
      lines.push(`Descripción: ${comp.descripcion}`);
    }
    if (nota !== undefined && nota !== null) {
      lines.push(`Calificación competencia: ${nota}`);
    }

    // Desempeños = evaluaciones del plan de estudios
    const desempenos = Array.isArray(comp.evaluaciones) ? comp.evaluaciones : [];
    if (desempenos.length) {
      lines.push(`\nDesempeños:`);
      for (const ev of desempenos) {
        const desc = typeof ev === "string" ? ev : ev?.descripcion || ev?.nombre || "";
        const evNota = typeof ev === "object" ? ev?.nota : undefined;
        if (!desc) continue;
        lines.push(`- ${desc}${evNota !== undefined && evNota !== null ? ` (nota: ${evNota})` : ""}`);
      }
    }

    // Actividades opcionales (compatibilidad con planes antiguos)
    if (Array.isArray(comp.actividades) && comp.actividades.length) {
      lines.push("\nActividades:");
      for (const a of comp.actividades) {
        lines.push(`- ${typeof a === "string" ? a : a.nombre || a.titulo || JSON.stringify(a)}`);
      }
    }

    await ingest.mutateAsync({
      sourceType: "competence",
      title: `${asignaturaNombre} – ${competenciaNombre}`,
      textContent: lines.join("\n"),
    });
    handleClose();
  };

  const busy = uploading || ingest.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Añadir fuente al cuaderno</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="file" className="gap-1"><Upload className="h-4 w-4" />Archivo</TabsTrigger>
            <TabsTrigger value="competence" className="gap-1"><GraduationCap className="h-4 w-4" />Plan</TabsTrigger>
            <TabsTrigger value="text" className="gap-1"><Type className="h-4 w-4" />Texto</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="py-6">
            <Label className="block mb-3">PDF, DOCX, XLSX o CSV (máx. 25 MB)</Label>
            <label className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-accent transition">
              <FileText className="h-10 w-10 text-muted-foreground mb-2" />
              <span className="text-sm">Haz clic para seleccionar archivo</span>
              <input type="file" accept=".pdf,.docx,.doc,.xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} disabled={busy} />
            </label>
            {busy && (
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Subiendo y procesando…
              </div>
            )}
          </TabsContent>

          <TabsContent value="text" className="py-6 space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={textTitle} onChange={(e) => setTextTitle(e.target.value)} placeholder="Notas de clase" />
            </div>
            <div>
              <Label>Contenido</Label>
              <Textarea rows={8} value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Pega tu texto aquí…" />
            </div>
            <Button onClick={handleAddText} disabled={busy || !textContent.trim()}>
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Añadir texto
            </Button>
          </TabsContent>

          <TabsContent value="url" className="py-6 space-y-3">
            <Label>URL de la página</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            <Button onClick={handleAddUrl} disabled={busy || !url.trim()}>
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Añadir página web
            </Button>
          </TabsContent>

          <TabsContent value="video" className="py-6 space-y-3">
            <Label>Título</Label>
            <Input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Resumen del video" />
            <Label>URL del video (YouTube, Vimeo, etc.)</Label>
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
            <p className="text-xs text-muted-foreground">El video se guardará como referencia. Para análisis del contenido pega también una transcripción en una fuente de Texto.</p>
            <Button onClick={handleAddVideo} disabled={busy || !videoUrl.trim()}>
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Añadir video
            </Button>
          </TabsContent>

          <TabsContent value="competence" className="py-4 max-h-96 overflow-auto space-y-3">
            {!studyPlans?.length ? (
              <div className="text-center py-8 space-y-3">
                <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Aún no tienes un plan de estudios. Créalo primero para usar tus competencias como fuente.
                </p>
                <Button asChild size="sm">
                  <a href="/study-plan">Crear mi plan de estudios</a>
                </Button>
              </div>
            ) : (
              studyPlans.map((plan: any) => (
                <div key={plan.id} className="border rounded-lg p-3">
                  <p className="font-semibold text-sm mb-2">{plan.grade} · {plan.academic_year}</p>
                  {(plan.periodos || []).map((per: any, pi: number) => (
                    <div key={pi} className="ml-2 mb-2">
                      <p className="text-xs font-medium text-muted-foreground">{getPeriodoName(per, pi)}</p>
                      {(per.asignaturas || []).map((asg: any, ai: number) => (
                        <div key={ai} className="ml-3 mt-2">
                          <p className="text-xs font-semibold">{getAsignaturaName(asg)}</p>
                          {(asg.competencias || []).map((comp: any, ci: number) => {
                            const compNombre = getCompetenciaName(comp);
                            const nota = getCompetenciaNota(comp);
                            return (
                              <button
                                key={ci}
                                onClick={() => handleAddCompetence(plan.id, pi, ai, ci)}
                                disabled={busy}
                                className="block w-full text-left text-xs p-2 rounded hover:bg-accent ml-2 mt-1 border"
                              >
                                <span className="font-medium">{compNombre}</span>
                                {nota !== undefined && nota !== null && (
                                  <span className={`ml-2 ${Number(nota) < 3.5 ? "text-destructive" : "text-muted-foreground"}`}>
                                    · Nota: {nota}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={busy}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
