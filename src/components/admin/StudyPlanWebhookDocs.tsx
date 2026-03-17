import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Copy, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const CopyBlock = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto font-mono whitespace-pre-wrap break-all">
        {text}
      </pre>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-7 px-2"
        onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </Button>
    </div>
  );
};

export const StudyPlanWebhookDocs = () => {
  const projectUrl = import.meta.env.VITE_SUPABASE_URL;
  const webhookUrl = `${projectUrl}/functions/v1/webhook-study-plan`;

  const payloadExample = `{
  "institucion": {
    "id": "uuid-opcional",
    "nit": "900123456"
  },
  "estudiante": {
    "id": "uuid-opcional",
    "document_number": "1192872323",
    "curso_academico": "2026",
    "grado": "Once (11°)"
  },
  "periodos": [
    {
      "periodo_nombre": "Segundo Periodo",
      "asignaturas": [
        {
          "nombre_asignatura": "Física",
          "nota_final_asignatura": null,
          "competencias": [
            {
              "nombre_competencia": "Indagación y Experimentación",
              "calificacion_competencia": 3.8,
              "evaluaciones": [
                {
                  "descripcion": "Laboratorio de Óptica",
                  "nota": 3.8
                },
                {
                  "descripcion": "Informe de campo (Pendiente)",
                  "nota": null
                }
              ]
            },
            {
              "nombre_competencia": "Uso de conceptos científicos",
              "calificacion_competencia": null,
              "evaluaciones": [
                {
                  "descripcion": "Examen Final de Periodo",
                  "nota": null
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}`;

  const successResponse = `{
  "success": true,
  "message": "Plan de estudios actualizado correctamente",
  "study_plan_id": "uuid-del-plan",
  "student_id": "uuid-del-estudiante",
  "timestamp": "2026-03-17T12:00:00.000Z"
}`;

  const errorResponse = `{
  "error": "Estudiante con documento 1192872323 no encontrado"
}`;

  const curlExample = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-key: TU_WEBHOOK_API_KEY" \\
  -d '{
    "institucion": { "nit": "900123456" },
    "estudiante": {
      "document_number": "1192872323",
      "curso_academico": "2026",
      "grado": "Once (11°)"
    },
    "periodos": [...]
  }'`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Badge variant="secondary">POST</Badge>
          Webhook de Plan de Estudios
        </CardTitle>
        <CardDescription>
          Endpoint para recibir y actualizar planes de estudios desde el gestor académico
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Requiere autenticación con header <code className="bg-muted px-1 rounded">x-webhook-key</code>. 
            Si el plan ya existe para el mismo estudiante y año académico, se actualiza automáticamente (upsert).
          </AlertDescription>
        </Alert>

        <Separator />

        {/* URL */}
        <div>
          <h3 className="font-semibold mb-2">URL del Webhook</h3>
          <CopyBlock text={webhookUrl} />
        </div>

        <Separator />

        {/* Headers */}
        <div>
          <h3 className="font-semibold mb-2">Headers Requeridos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium">Header</th>
                  <th className="text-left py-2 px-3 font-medium">Valor</th>
                  <th className="text-left py-2 px-3 font-medium">Descripción</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 font-mono text-primary">Content-Type</td>
                  <td className="py-2 px-3"><code className="bg-muted px-1 rounded text-xs">application/json</code></td>
                  <td className="py-2 px-3 text-muted-foreground">Tipo de contenido</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 font-mono text-primary">x-webhook-key</td>
                  <td className="py-2 px-3"><code className="bg-muted px-1 rounded text-xs">WEBHOOK_API_KEY</code></td>
                  <td className="py-2 px-3 text-muted-foreground">Clave de autenticación del webhook</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <Separator />

        {/* Campos del payload */}
        <div>
          <h3 className="font-semibold mb-2">Campos del Payload</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium">Campo</th>
                  <th className="text-left py-2 px-3 font-medium">Tipo</th>
                  <th className="text-left py-2 px-3 font-medium">Req.</th>
                  <th className="text-left py-2 px-3 font-medium">Descripción</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 font-mono text-primary">institucion.nit</td>
                  <td className="py-2 px-3"><Badge variant="outline" className="text-xs">string</Badge></td>
                  <td className="py-2 px-3"><Badge className="bg-red-500/10 text-red-500 text-xs">Sí</Badge></td>
                  <td className="py-2 px-3 text-muted-foreground">NIT de la institución registrada en Sedefy</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 font-mono text-primary">estudiante.document_number</td>
                  <td className="py-2 px-3"><Badge variant="outline" className="text-xs">string</Badge></td>
                  <td className="py-2 px-3"><Badge className="bg-red-500/10 text-red-500 text-xs">Sí</Badge></td>
                  <td className="py-2 px-3 text-muted-foreground">Número de documento del estudiante</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 font-mono text-primary">estudiante.curso_academico</td>
                  <td className="py-2 px-3"><Badge variant="outline" className="text-xs">string</Badge></td>
                  <td className="py-2 px-3"><Badge className="bg-red-500/10 text-red-500 text-xs">Sí</Badge></td>
                  <td className="py-2 px-3 text-muted-foreground">Año académico (ej: "2026")</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 font-mono text-primary">estudiante.grado</td>
                  <td className="py-2 px-3"><Badge variant="outline" className="text-xs">string</Badge></td>
                  <td className="py-2 px-3"><Badge className="bg-red-500/10 text-red-500 text-xs">Sí</Badge></td>
                  <td className="py-2 px-3 text-muted-foreground">Grado del estudiante (ej: "Once (11°)")</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 font-mono text-primary">periodos</td>
                  <td className="py-2 px-3"><Badge variant="outline" className="text-xs">array</Badge></td>
                  <td className="py-2 px-3"><Badge className="bg-red-500/10 text-red-500 text-xs">Sí</Badge></td>
                  <td className="py-2 px-3 text-muted-foreground">Lista de periodos con asignaturas, competencias y evaluaciones</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 font-mono text-primary">periodos[].asignaturas[].nota_final_asignatura</td>
                  <td className="py-2 px-3"><Badge variant="outline" className="text-xs">number|null</Badge></td>
                  <td className="py-2 px-3"><span className="text-xs text-muted-foreground">No</span></td>
                  <td className="py-2 px-3 text-muted-foreground">Nota final, null si aún no calificada</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 font-mono text-primary">periodos[].asignaturas[].competencias[].evaluaciones[].nota</td>
                  <td className="py-2 px-3"><Badge variant="outline" className="text-xs">number|null</Badge></td>
                  <td className="py-2 px-3"><span className="text-xs text-muted-foreground">No</span></td>
                  <td className="py-2 px-3 text-muted-foreground">Nota de la evaluación, null si pendiente</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <Separator />

        {/* Payload example */}
        <div>
          <h3 className="font-semibold mb-2">Ejemplo de Payload</h3>
          <CopyBlock text={payloadExample} />
        </div>

        <Separator />

        {/* Responses */}
        <div>
          <h3 className="font-semibold mb-2">Respuesta Exitosa (200)</h3>
          <CopyBlock text={successResponse} />
        </div>

        <div>
          <h3 className="font-semibold mb-2">Respuesta de Error (400/404/500)</h3>
          <CopyBlock text={errorResponse} />
        </div>

        <Separator />

        {/* cURL */}
        <div>
          <h3 className="font-semibold mb-2">Ejemplo con cURL</h3>
          <CopyBlock text={curlExample} />
        </div>

        <Separator />

        {/* Behavior */}
        <div>
          <h3 className="font-semibold mb-2">Comportamiento</h3>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Busca la institución por <code className="bg-muted px-1 rounded">nit</code></li>
            <li>Busca al estudiante por <code className="bg-muted px-1 rounded">numero_documento</code> en perfiles</li>
            <li>Si ya existe un plan para el mismo estudiante y año académico, lo <strong>actualiza</strong> (upsert)</li>
            <li>Si no existe, lo <strong>crea</strong></li>
            <li>Los periodos se almacenan como JSON completo, permitiendo actualizaciones parciales o totales</li>
            <li>El estudiante puede ver su plan en <code className="bg-muted px-1 rounded">/study-plan</code></li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
