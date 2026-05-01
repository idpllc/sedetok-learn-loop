import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  Database,
  FileCode2,
  Shield,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const blockingMigration = "20260430032027_ec6dba70-9ae7-40bf-a500-5661fd6653f9.sql";
const blockingStatement = "CREATE UNIQUE INDEX user_path_progress_unique_content";

const diagnosticSummary = [
  { label: "Entorno Live", value: "Backend responde con normalidad", status: "ok" },
  { label: "Última migración aplicada en Live", value: "20260501060502_publish_phase1_migration_from_pg_dump", status: "ok" },
  { label: "Primera migración pendiente", value: blockingMigration, status: "blocked" },
  { label: "Error exacto", value: "Duplicados bloquean índice único en user_path_progress", status: "blocked" },
];

const liveChecks = [
  { label: "user_path_progress_unique_content", value: "No existe en Live" },
  { label: "user_path_progress_unique_quiz", value: "No existe en Live" },
  { label: "user_path_progress_unique_game", value: "No existe en Live" },
  { label: "user_path_progress_user_id_path_id_content_id_quiz_id_key", value: "Sigue existiendo el constraint legado" },
  { label: "Duplicados content_id", value: "143 grupos duplicados / 651 filas sobrantes" },
  { label: "Duplicados quiz_id", value: "26 grupos duplicados / 31 filas sobrantes" },
  { label: "Duplicados game_id", value: "0 grupos duplicados" },
  { label: "Fila más repetida", value: "124 registros para el mismo usuario + ruta + contenido" },
];

const pendingMigrations = [
  {
    file: blockingMigration,
    title: "Índices únicos de progreso de rutas",
    state: "Bloqueante confirmado",
    detail: "Live tiene datos duplicados en user_path_progress. Al crear el índice único por usuario + ruta + contenido, la publicación se detiene.",
  },
  {
    file: "20260501071210_6a396e63-ad46-4b7b-990a-190310e9ebe2.sql",
    title: "Security hardening",
    state: "Pendiente",
    detail: "No es el bloqueo actual: queda pendiente porque Live no supera primero la migración de índices de progreso.",
  },
  {
    file: "20260501073129_f16a78a3-48b3-4e0d-95c8-f7e0f5b90426.sql",
    title: "Módulo Notebook",
    state: "Pendiente",
    detail: "Crea notebooks, notebook_sources y columnas relacionadas; Live todavía no llegó a esta migración.",
  },
];

const suspectedSql = `-- Archivo bloqueante confirmado: ${blockingMigration}
-- Error esperado en Live:
-- ERROR: could not create unique index "user_path_progress_unique_content"
-- DETAIL: Key (user_id, path_id, content_id) is duplicated.

-- Evidencia directa en Live:
-- content_id: 143 grupos duplicados / 651 filas sobrantes
-- quiz_id: 26 grupos duplicados / 31 filas sobrantes
-- game_id: 0 grupos duplicados
-- grupo más grande: 124 registros para el mismo user_id + path_id + content_id

CREATE UNIQUE INDEX IF NOT EXISTS user_path_progress_unique_content
  ON public.user_path_progress (user_id, path_id, content_id)
  WHERE content_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_path_progress_unique_quiz
  ON public.user_path_progress (user_id, path_id, quiz_id)
  WHERE quiz_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_path_progress_unique_game
  ON public.user_path_progress (user_id, path_id, game_id)
  WHERE game_id IS NOT NULL;`;

const repairSql = `-- Ejecutar en Live ANTES de publicar.
-- Esto elimina duplicados por la misma llave que exige el índice bloqueante.

DELETE FROM public.user_path_progress a
USING public.user_path_progress b
WHERE a.id <> b.id
  AND a.user_id = b.user_id
  AND a.path_id = b.path_id
  AND a.content_id IS NOT NULL
  AND a.content_id = b.content_id
  AND (
    COALESCE(a.completed, false),
    COALESCE(a.completed_at, a.updated_at, a.created_at, 'epoch'::timestamptz),
    a.id
  ) < (
    COALESCE(b.completed, false),
    COALESCE(b.completed_at, b.updated_at, b.created_at, 'epoch'::timestamptz),
    b.id
  );

DELETE FROM public.user_path_progress a
USING public.user_path_progress b
WHERE a.id <> b.id
  AND a.user_id = b.user_id
  AND a.path_id = b.path_id
  AND a.quiz_id IS NOT NULL
  AND a.quiz_id = b.quiz_id
  AND (
    COALESCE(a.completed, false),
    COALESCE(a.completed_at, a.updated_at, a.created_at, 'epoch'::timestamptz),
    a.id
  ) < (
    COALESCE(b.completed, false),
    COALESCE(b.completed_at, b.updated_at, b.created_at, 'epoch'::timestamptz),
    b.id
  );`;

const copyPayload = `Publishing failed diagnostic

Live latest migration: 20260501060502_publish_phase1_migration_from_pg_dump
Blocking migration: ${blockingMigration}
Blocking statement: ${blockingStatement}
Reason: Live has duplicate user_path_progress rows, so the unique index cannot be created.

Suspected SQL:
${suspectedSql}

Live repair SQL:
${repairSql}`;

type DuplicateStats = {
  duplicate_groups: number;
  redundant_rows: number;
  largest_group: number;
};

type PreflightResult = {
  checked_at: string;
  has_duplicates: boolean;
  can_publish_progress_indexes: boolean;
  total_duplicate_groups: number;
  total_redundant_rows: number;
  largest_group: number;
  invalid_rows: number;
  message: string;
  duplicates: {
    content_id: DuplicateStats;
    quiz_id: DuplicateStats;
    game_id: DuplicateStats;
  };
};

export default function PublishingErrorDetails() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin, loading } = useSuperAdmin();
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [preflightLoading, setPreflightLoading] = useState(false);

  const generatedAt = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date()),
    [],
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(copyPayload);
    toast({ title: "Detalle copiado", description: "El diagnóstico de publicación quedó en el portapapeles." });
  };

  const runPreflight = async () => {
    setPreflightLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("publishing-preflight", {
        body: { table: "user_path_progress" },
      });

      if (error) throw error;
      if (!data?.result) throw new Error("La verificación no devolvió resultados.");

      setPreflight(data.result as PreflightResult);
      toast({
        title: data.result.has_duplicates ? "Preflight bloqueado" : "Preflight correcto",
        description: data.result.message,
        variant: data.result.has_duplicates ? "destructive" : "default",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo ejecutar la verificación previa.";
      toast({ title: "Error en preflight", description: message, variant: "destructive" });
    } finally {
      setPreflightLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <Shield className="mb-4 h-16 w-16 text-destructive" />
        <h1 className="mb-2 text-2xl font-bold">Acceso denegado</h1>
        <p className="mb-6 max-w-md text-muted-foreground">Solo un superadministrador puede ver diagnósticos de publicación.</p>
        <Button onClick={() => navigate("/")}>Ir al inicio</Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background pt-14 md:pt-0">
      <Helmet>
        <title>Detalle error publicación | Sedefy</title>
        <meta name="description" content="Diagnóstico interno del error de publicación y migración bloqueante en Live." />
      </Helmet>

      <section className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <Button variant="ghost" className="-ml-3 gap-2" onClick={() => navigate("/admin")}>
                <ArrowLeft className="h-4 w-4" />
                Volver al panel
              </Button>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">Detalle del error de publicación</h1>
                <Badge variant="destructive">Live bloqueado</Badge>
              </div>
              <p className="max-w-3xl text-muted-foreground">
                Diagnóstico generado desde comprobaciones directas en Live. La publicación falla al intentar crear un índice único sobre progreso de rutas.
              </p>
            </div>
            <Button onClick={handleCopy} className="gap-2 self-start lg:self-center">
              <Copy className="h-4 w-4" />
              Copiar detalle
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto space-y-6 px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Migración exacta bloqueante confirmada</AlertTitle>
          <AlertDescription className="space-y-2 break-words text-xs sm:text-sm">
            <p className="font-mono">{blockingMigration}</p>
            <p className="font-mono">{blockingStatement}</p>
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {diagnosticSummary.map((item) => (
            <Card key={item.label}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  {item.status === "ok" ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Clock3 className="h-4 w-4 text-destructive" />}
                  {item.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="break-words text-sm text-muted-foreground">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Comprobaciones directas en Live
            </CardTitle>
            <CardDescription>Última verificación: {generatedAt}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {liveChecks.map((check) => (
                <div key={check.label} className="flex items-start justify-between gap-4 rounded-md border bg-muted/40 p-3">
                  <div>
                    <p className="break-words font-mono text-sm">{check.label}</p>
                    <p className="text-sm text-muted-foreground">{check.value}</p>
                  </div>
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode2 className="h-5 w-5 text-primary" />
              Cola de migraciones pendiente en Live
            </CardTitle>
            <CardDescription>Live se detiene en la migración de índices antes de llegar a seguridad y Notebook.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingMigrations.map((migration, index) => (
                <div key={migration.file} className="rounded-md border p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={index === 0 ? "destructive" : "outline"}>{migration.state}</Badge>
                        <span className="font-semibold">{migration.title}</span>
                      </div>
                      <p className="break-words font-mono text-xs text-muted-foreground">{migration.file}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">#{index + 1}</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{migration.detail}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Accordion type="single" collapsible defaultValue="sql" className="rounded-lg border px-4">
          <AccordionItem value="sql" className="border-0">
            <AccordionTrigger>SQL exacto dentro de la migración bloqueante</AccordionTrigger>
            <AccordionContent>
              <pre className="max-h-[520px] overflow-auto rounded-md bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
                <code>{suspectedSql}</code>
              </pre>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="repair" className="border-t">
            <AccordionTrigger>SQL de reparación para Live</AccordionTrigger>
            <AccordionContent>
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Acción requerida en Live</AlertTitle>
                <AlertDescription>
                  Ejecutar este saneamiento en Live antes de publicar, porque una migración posterior no puede correr hasta superar el índice bloqueante.
                </AlertDescription>
              </Alert>
              <pre className="max-h-[520px] overflow-auto rounded-md bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
                <code>{repairSql}</code>
              </pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </main>
  );
}