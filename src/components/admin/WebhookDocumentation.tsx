import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const WebhookDocumentation = () => {
  const projectUrl = import.meta.env.VITE_SUPABASE_URL;
  const webhookUrl = `${projectUrl}/functions/v1/webhook-subject-results`;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Badge variant="secondary">POST</Badge>
          Webhook de Consolidado de Notas
        </CardTitle>
        <CardDescription>
          Endpoint webhook para recibir consolidados de notas desde sistemas académicos externos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alerta de Seguridad */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Este webhook requiere autenticación mediante API Key en el header <code>x-webhook-key</code>. 
            Contacte al administrador para obtener la clave de acceso.
          </AlertDescription>
        </Alert>

        <Separator />

        {/* URL del Webhook */}
        <div>
          <h3 className="font-semibold mb-2">URL del Webhook</h3>
          <code className="block bg-muted p-3 rounded-md text-sm break-all">
            {webhookUrl}
          </code>
        </div>

        <Separator />

        {/* Descripción */}
        <div>
          <h3 className="font-semibold mb-2">Descripción</h3>
          <p className="text-sm text-muted-foreground">
            Este webhook permite a sistemas externos (como Sedefy Académico) enviar consolidados 
            de notas de múltiples estudiantes en una sola llamada. Los resultados se almacenan 
            automáticamente en la base de datos y se vinculan con las instituciones y usuarios existentes.
          </p>
        </div>

        <Separator />

        {/* Características */}
        <div>
          <h3 className="font-semibold mb-2">Características Principales</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Procesamiento de múltiples resultados en una sola petición</li>
            <li>Autenticación mediante API Key segura</li>
            <li>Validación de áreas académicas según estándares colombianos</li>
            <li>Vinculación automática con instituciones por NIT</li>
            <li>Soporte para datos de sede, grado y grupo</li>
            <li>Logging detallado para auditoría</li>
            <li>Respuesta con resumen de éxitos y errores</li>
          </ul>
        </div>

        <Separator />

        {/* Headers Requeridos */}
        <div>
          <h3 className="font-semibold mb-2">Headers Requeridos</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
            <li><code>Content-Type: application/json</code></li>
            <li><code>x-webhook-key: YOUR_WEBHOOK_API_KEY</code></li>
          </ul>
        </div>

        <Separator />

        {/* Estructura del Payload */}
        <div>
          <h3 className="font-semibold mb-2">Estructura del Request Body</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Campos del Payload Principal:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li><strong>results</strong> (array, requerido): Array de resultados académicos</li>
                <li><strong>source</strong> (string, opcional): Identificador del sistema que envía los datos</li>
                <li><strong>timestamp</strong> (string, opcional): Marca de tiempo del envío</li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Campos de cada Result:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li><strong>tipo_documento</strong> (string, requerido): CC, TI, CE, etc.</li>
                <li><strong>numero_documento</strong> (string, requerido): Número de documento del estudiante</li>
                <li><strong>nit_institucion</strong> (string, requerido): NIT de la institución educativa</li>
                <li><strong>nombre_sede</strong> (string, opcional): Nombre de la sede</li>
                <li><strong>area_academica</strong> (string, requerido): Área académica (ver lista válida abajo)</li>
                <li><strong>asignatura_nombre</strong> (string, requerido): Nombre de la asignatura</li>
                <li><strong>grado</strong> (string, requerido): Grado del estudiante (ej: "7", "10°", "Preescolar")</li>
                <li><strong>grupo</strong> (string, requerido): Grupo del estudiante (ej: "A", "B", "701")</li>
                <li><strong>periodo_academico</strong> (string, requerido): Periodo académico (ej: "2025-1", "Primer Período")</li>
                <li><strong>score</strong> (number, requerido): Calificación obtenida</li>
                <li><strong>max_score</strong> (number, requerido): Calificación máxima posible</li>
                <li><strong>passed</strong> (boolean, requerido): Si aprobó o no</li>
                <li><strong>docente_nombre</strong> (string, opcional): Nombre del docente</li>
                <li><strong>observaciones</strong> (string, opcional): Observaciones adicionales</li>
                <li><strong>completed_at</strong> (string, opcional): Fecha de finalización (ISO 8601)</li>
              </ul>
            </div>
          </div>
        </div>

        <Separator />

        {/* Áreas Académicas Válidas */}
        <div>
          <h3 className="font-semibold mb-2">Áreas Académicas Válidas</h3>
          <div className="flex flex-wrap gap-2">
            {[
              'Ciencias Naturales',
              'Ciencias Sociales',
              'Matemáticas',
              'Lenguaje',
              'Inglés',
              'Educación Física',
              'Artes',
              'Tecnología',
              'Ética y Valores',
              'Religión',
              'Filosofía',
              'Ciencias Políticas y Económicas'
            ].map((area) => (
              <Badge key={area} variant="outline" className="text-xs">
                {area}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Ejemplo de Request */}
        <div>
          <h3 className="font-semibold mb-2">Ejemplo de Request</h3>
          <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`curl -X POST '${webhookUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-webhook-key: YOUR_WEBHOOK_API_KEY' \\
  -d '{
    "source": "Sedefy Académico",
    "timestamp": "2025-10-25T15:30:00Z",
    "results": [
      {
        "tipo_documento": "TI",
        "numero_documento": "1234567890",
        "nit_institucion": "900123456",
        "nombre_sede": "Sede Principal",
        "area_academica": "Matemáticas",
        "asignatura_nombre": "Álgebra",
        "grado": "7",
        "grupo": "A",
        "periodo_academico": "2025-1",
        "score": 4.2,
        "max_score": 5.0,
        "passed": true,
        "docente_nombre": "Prof. Juan García",
        "observaciones": "Excelente desempeño",
        "completed_at": "2025-10-20T10:00:00Z"
      },
      {
        "tipo_documento": "TI",
        "numero_documento": "9876543210",
        "nit_institucion": "900123456",
        "nombre_sede": "Sede Principal",
        "area_academica": "Ciencias Naturales",
        "asignatura_nombre": "Biología",
        "grado": "7",
        "grupo": "A",
        "periodo_academico": "2025-1",
        "score": 3.8,
        "max_score": 5.0,
        "passed": true,
        "docente_nombre": "Prof. María López"
      }
    ]
  }'`}
          </pre>
        </div>

        <Separator />

        {/* Respuestas */}
        <div>
          <h3 className="font-semibold mb-2">Respuestas del Webhook</h3>
          
          <div className="space-y-4">
            <div>
              <Badge className="mb-2">200 Success</Badge>
              <p className="text-sm text-muted-foreground mb-2">
                Procesamiento completado (puede incluir éxitos y errores parciales)
              </p>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`{
  "success": true,
  "summary": {
    "total": 2,
    "processed": 2,
    "errors": 0
  },
  "processed": [
    {
      "numero_documento": "1234567890",
      "asignatura_nombre": "Álgebra",
      "success": true
    },
    {
      "numero_documento": "9876543210",
      "asignatura_nombre": "Biología",
      "success": true
    }
  ],
  "source": "Sedefy Académico",
  "timestamp": "2025-10-25T15:30:05.123Z"
}`}
              </pre>
            </div>

            <div>
              <Badge variant="destructive" className="mb-2">401 Unauthorized</Badge>
              <p className="text-sm text-muted-foreground mb-2">API Key inválida o faltante</p>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`{
  "error": "Unauthorized",
  "message": "Invalid or missing webhook API key"
}`}
              </pre>
            </div>

            <div>
              <Badge variant="destructive" className="mb-2">400 Bad Request</Badge>
              <p className="text-sm text-muted-foreground mb-2">Datos inválidos</p>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`{
  "error": "El campo 'results' es requerido y debe ser un array"
}`}
              </pre>
            </div>

            <div>
              <Badge className="mb-2">200 Partial Success</Badge>
              <p className="text-sm text-muted-foreground mb-2">
                Algunos resultados se procesaron exitosamente, otros fallaron
              </p>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`{
  "success": true,
  "summary": {
    "total": 3,
    "processed": 2,
    "errors": 1
  },
  "processed": [...],
  "errors": [
    {
      "numero_documento": "111111111",
      "error": "Usuario no encontrado"
    }
  ],
  "timestamp": "2025-10-25T15:30:05.123Z"
}`}
              </pre>
            </div>
          </div>
        </div>

        <Separator />

        {/* Ejemplos de Código */}
        <div>
          <h3 className="font-semibold mb-2">Ejemplos de Integración</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">JavaScript/TypeScript</h4>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`const sendGrades = async (results) => {
  const response = await fetch('${webhookUrl}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-key': process.env.WEBHOOK_API_KEY
    },
    body: JSON.stringify({
      source: 'Mi Sistema Académico',
      timestamp: new Date().toISOString(),
      results: results
    })
  });

  const data = await response.json();
  
  if (response.ok) {
    console.log(\`Procesados: \${data.summary.processed}\`);
    console.log(\`Errores: \${data.summary.errors}\`);
    
    if (data.errors) {
      console.error('Errores:', data.errors);
    }
  } else {
    console.error('Error:', data.error);
  }
  
  return data;
};`}
              </pre>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Python</h4>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`import requests
from datetime import datetime

def send_grades(results):
    url = '${webhookUrl}'
    headers = {
        'Content-Type': 'application/json',
        'x-webhook-key': 'YOUR_WEBHOOK_API_KEY'
    }
    
    payload = {
        'source': 'Mi Sistema Académico',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'results': results
    }
    
    response = requests.post(url, json=payload, headers=headers)
    data = response.json()
    
    if response.ok:
        print(f"Procesados: {data['summary']['processed']}")
        print(f"Errores: {data['summary']['errors']}")
        
        if 'errors' in data:
            print("Errores:", data['errors'])
    else:
        print("Error:", data['error'])
    
    return data`}
              </pre>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">PHP</h4>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`<?php
function sendGrades($results) {
    $url = '${webhookUrl}';
    
    $payload = [
        'source' => 'Mi Sistema Académico',
        'timestamp' => gmdate('Y-m-d\\TH:i:s\\Z'),
        'results' => $results
    ];
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'x-webhook-key: YOUR_WEBHOOK_API_KEY'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $data = json_decode($response, true);
    
    if ($httpCode === 200) {
        echo "Procesados: " . $data['summary']['processed'] . "\\n";
        echo "Errores: " . $data['summary']['errors'] . "\\n";
        
        if (isset($data['errors'])) {
            print_r($data['errors']);
        }
    } else {
        echo "Error: " . $data['error'] . "\\n";
    }
    
    return $data;
}
?>`}
              </pre>
            </div>
          </div>
        </div>

        <Separator />

        {/* Mejores Prácticas */}
        <div>
          <h3 className="font-semibold mb-2">Mejores Prácticas</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><strong>Seguridad:</strong> Mantenga la API Key del webhook segura y nunca la exponga en código cliente</li>
            <li><strong>Batch Size:</strong> Envíe hasta 100 resultados por petición para mejor rendimiento</li>
            <li><strong>Retry Logic:</strong> Implemente reintentos con backoff exponencial para errores de red</li>
            <li><strong>Validación:</strong> Valide los datos antes de enviarlos para reducir errores</li>
            <li><strong>Logging:</strong> Registre todas las respuestas del webhook para auditoría</li>
            <li><strong>Timeout:</strong> Configure timeouts de al menos 30 segundos</li>
            <li><strong>Error Handling:</strong> Procese errores parciales y reintente solo los registros fallidos</li>
            <li><strong>Timestamps:</strong> Use formato ISO 8601 (UTC) para todas las fechas</li>
          </ul>
        </div>

        <Separator />

        {/* Validaciones Importantes */}
        <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg">
          <h3 className="font-semibold mb-2 text-yellow-900 dark:text-yellow-100">
            ⚠️ Validaciones Previas Requeridas
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
            <li>La institución con el NIT especificado debe existir en el sistema</li>
            <li>El usuario con el número de documento debe estar registrado</li>
            <li>El área académica debe ser exactamente una de las válidas listadas arriba</li>
            <li>Los campos score y max_score deben ser números válidos</li>
            <li>El campo passed debe ser un booleano (true/false)</li>
          </ul>
        </div>

        <Separator />

        {/* Soporte */}
        <div>
          <h3 className="font-semibold mb-2">Soporte Técnico</h3>
          <p className="text-sm text-muted-foreground">
            Para obtener su API Key del webhook o asistencia técnica, contacte al equipo de soporte de Sedetok.
            El webhook incluye logging detallado para facilitar el debugging de cualquier problema.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
