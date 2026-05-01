import { useMemo } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const blockingMigration = "20260501071210_6a396e63-ad46-4b7b-990a-190310e9ebe2.sql";

const diagnosticSummary = [
  { label: "Entorno Live", value: "Backend responde con normalidad", status: "ok" },
  { label: "Última migración aplicada en Live", value: "20260501060502_publish_phase1_migration_from_pg_dump", status: "ok" },
  { label: "Primera migración pendiente", value: blockingMigration, status: "blocked" },
  { label: "Último esquema en Test", value: "20260501073128", status: "pending" },
];

const liveChecks = [
  { label: "public.notebooks", value: "No existe en Live", blocked: true },
  { label: "public.notebook_sources", value: "No existe en Live", blocked: true },
  { label: "content.reading_type", value: "No existe en Live", blocked: true },
  { label: "content.mind_map_data", value: "No existe en Live", blocked: true },
  { label: "ai_chat_conversations.notebook_id", value: "No existe en Live", blocked: true },
  { label: "ai_chat_conversations.notebook_source_id", value: "No existe en Live", blocked: true },
  { label: "user_quiz_results", value: "Aún conserva la política pública anterior", blocked: true },
  { label: "institution_members", value: "Aún conserva la política pública anterior", blocked: true },
];

const pendingMigrations = [
  {
    file: blockingMigration,
    title: "Security hardening",
    state: "Bloqueante probable",
    detail: "Es la primera migración después del estado actual de Live. Cambia permisos de columnas sensibles y reemplaza políticas públicas.",
  },
  {
    file: "20260501071636_00a969e3-31a3-4078-9b61-11b220f0ac5d.sql",
    title: "Restaurar permisos de funciones RLS",
    state: "Pendiente",
    detail: "Solo puede ejecutarse después de que termine la migración de seguridad.",
  },
  {
    file: "20260501073129_f16a78a3-48b3-4e0d-95c8-f7e0f5b90426.sql",
    title: "Módulo Notebook",
    state: "Pendiente",
    detail: "Crea notebooks, notebook_sources y columnas relacionadas; Live todavía no llegó a esta migración.",
  },
];

const suspectedSql = `-- Archivo bloqueante probable: ${blockingMigration}
REVOKE SELECT (numero_documento, phone, fecha_nacimiento) ON public.profiles FROM anon;
REVOKE SELECT (numero_documento, phone, fecha_nacimiento) ON public.profiles FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_profile_private_fields(_user_id uuid)
RETURNS TABLE(numero_documento text, phone text, fecha_nacimiento date, tipo_documento text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.numero_documento, p.phone, p.fecha_nacimiento, p.tipo_documento
  FROM public.profiles p
  WHERE p.id = _user_id
    AND (
      auth.uid() = p.id
      OR public.has_role(auth.uid(), 'superadmin'::app_role)
      OR public.can_view_student_data(auth.uid(), p.id)
    );
$$;

DROP POLICY IF EXISTS "Quiz results are publicly viewable" ON public.user_quiz_results;
CREATE POLICY "Institution staff can view student quiz results"
ON public.user_quiz_results
FOR SELECT
TO authenticated
USING (public.can_view_student_data(auth.uid(), user_id));

DROP POLICY IF EXISTS "Institution members are publicly viewable" ON public.institution_members;
CREATE POLICY "Members can view co-members of same institution"
ON public.institution_members
FOR SELECT
TO authenticated
USING (
  public.is_institution_member(auth.uid(), institution_id)
  OR public.is_institution_admin(auth.uid(), institution_id)
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
  OR user_id = auth.uid()
);`;

const copyPayload = `Publishing failed diagnostic

Live latest migration: 20260501060502_publish_phase1_migration_from_pg_dump
Blocking migration: ${blockingMigration}
Reason: Live has not applied the security hardening migration; notebook tables and columns are still missing.

Suspected SQL:
${suspectedSql}`;

export default function PublishingErrorDetails() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin, loading } = useSuperAdmin();

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
                Diagnóstico generado desde el estado real de Live y Test. La publicación falla antes de aplicar el módulo Notebook.
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
          <AlertTitle>Migración exacta bloqueante probable</AlertTitle>
          <AlertDescription className="break-words font-mono text-xs sm:text-sm">{blockingMigration}</AlertDescription>
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
            <CardDescription>Live se detiene en la primera migración de esta lista.</CardDescription>
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
            <AccordionTrigger>SQL sospechoso dentro de la migración bloqueante</AccordionTrigger>
            <AccordionContent>
              <pre className="max-h-[520px] overflow-auto rounded-md bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
                <code>{suspectedSql}</code>
              </pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </main>
  );
}