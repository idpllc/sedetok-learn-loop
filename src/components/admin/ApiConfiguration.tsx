import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code, Copy, Check, ExternalLink, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WebhookDocumentation } from "./WebhookDocumentation";

export function ApiConfiguration() {
  const { toast } = useToast();
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedExample, setCopiedExample] = useState(false);
  const [copiedContentEndpoint, setCopiedContentEndpoint] = useState(false);
  const [copiedContentExample, setCopiedContentExample] = useState(false);
  const [copiedUserEndpoint, setCopiedUserEndpoint] = useState(false);
  const [copiedAutoLoginEndpoint, setCopiedAutoLoginEndpoint] = useState(false);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const pathsEndpoint = `https://${projectId}.supabase.co/functions/v1/sedetok-search`;
  const contentEndpoint = `https://${projectId}.supabase.co/functions/v1/sedetok-content-search`;

  const pathsExampleRequest = `curl -X GET "${pathsEndpoint}?q=matematicas&grado=7&limit=10" \\
  -H "x-api-key: YOUR_API_KEY"`;

  const pathsExampleResponse = `{
  "data": [
    {
      "id": "uuid-here",
      "name": "Álgebra Básica",
      "description": "Introducción al álgebra para estudiantes de grado 7",
      "coverImage": "https://...",
      "url": "https://...lovableproject.com/learning-paths/uuid-here",
      "level": "basico",
      "tags": ["matemáticas", "álgebra", "números"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}`;

  const contentExampleRequest = `curl -X GET "${contentEndpoint}?q=ecosistemas&grado=primaria&tipo=video&limit=10" \\
  -H "x-api-key: YOUR_API_KEY"`;

  const contentExampleResponse = `{
  "data": [
    {
      "id": "uuid-here",
      "name": "Los Ecosistemas",
      "description": "Video educativo sobre los diferentes tipos de ecosistemas",
      "thumbnail": "https://...",
      "url": "https://...lovableproject.com/?contentId=uuid-here",
      "type": "video",
      "tags": ["ciencias", "ecosistemas", "naturaleza"],
      "views": 1234,
      "likes": 89
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 23,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}`;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    
    switch (type) {
      case 'endpoint':
        setCopiedEndpoint(true);
        setTimeout(() => setCopiedEndpoint(false), 2000);
        break;
      case 'example':
        setCopiedExample(true);
        setTimeout(() => setCopiedExample(false), 2000);
        break;
      case 'content-endpoint':
        setCopiedContentEndpoint(true);
        setTimeout(() => setCopiedContentEndpoint(false), 2000);
        break;
      case 'content-example':
        setCopiedContentExample(true);
        setTimeout(() => setCopiedContentExample(false), 2000);
        break;
      case 'user-endpoint':
        setCopiedUserEndpoint(true);
        setTimeout(() => setCopiedUserEndpoint(false), 2000);
        break;
    }
    
    toast({
      title: "Copiado",
      description: "Contenido copiado al portapapeles",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            API REST - Búsqueda de Rutas SEDEtok
          </CardTitle>
          <CardDescription>
            Endpoint de solo lectura para consumo desde SEDE Academy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Endpoint URL</label>
              <Badge variant="outline" className="gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Activo
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                {pathsEndpoint}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(pathsEndpoint, 'endpoint')}
              >
                {copiedEndpoint ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Para usar un dominio personalizado, configura el secret <code className="px-1 py-0.5 bg-muted rounded">CUSTOM_DOMAIN</code> (ej: https://tudominio.com). Esto cambiará las URLs en los resultados.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Autenticación</label>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                <span>API Key en header <code className="px-1 py-0.5 bg-muted rounded">x-api-key</code></span>
              </div>
              <p className="text-xs pl-6">
                ✓ Localhost/127.0.0.1: No requiere autenticación (desarrollo)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Parámetros de consulta</label>
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">q</code>
                <span className="text-muted-foreground">Palabras clave (requerido)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">grado</code>
                <span className="text-muted-foreground">Grado académico (opcional)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">asignatura</code>
                <span className="text-muted-foreground">Área académica (opcional)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">nivel</code>
                <span className="text-muted-foreground">basico | intermedio | avanzado (opcional)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">limit</code>
                <span className="text-muted-foreground">Resultados por página (default: 20, max: 50)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">page</code>
                <span className="text-muted-foreground">Número de página (default: 1)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">sort</code>
                <span className="text-muted-foreground">relevance_desc | created_desc | name_asc</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Rate Limit</label>
            <p className="text-sm text-muted-foreground">60 requests por minuto por API key</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">CORS</label>
            <p className="text-sm text-muted-foreground">Permitido para todos los orígenes (*)</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ejemplo de Uso</CardTitle>
          <CardDescription>Request y response de ejemplo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Request cURL</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(pathsExampleRequest, 'example')}
              >
                {copiedExample ? (
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                Copiar
              </Button>
            </div>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
              {pathsExampleRequest}
            </pre>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Response JSON</label>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
              {pathsExampleResponse}
            </pre>
          </div>

          <div className="pt-4">
            <Button variant="outline" className="w-full" asChild>
              <a 
                href="https://docs.lovable.dev/features/backend" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver Documentación Completa
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            API REST - Búsqueda de Cápsulas Educativas
          </CardTitle>
          <CardDescription>
            Endpoint para buscar videos, documentos y lecturas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Endpoint URL</label>
              <Badge variant="outline" className="gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Activo
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                {contentEndpoint}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(contentEndpoint, 'content-endpoint')}
              >
                {copiedContentEndpoint ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Parámetros de consulta</label>
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">q</code>
                <span className="text-muted-foreground">Palabras clave (requerido)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">grado</code>
                <span className="text-muted-foreground">Grado académico (opcional)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">asignatura</code>
                <span className="text-muted-foreground">Área académica (opcional)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">tipo</code>
                <span className="text-muted-foreground">video | documento | lectura (opcional)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">limit</code>
                <span className="text-muted-foreground">Resultados por página (default: 20, max: 50)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">page</code>
                <span className="text-muted-foreground">Número de página (default: 1)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">sort</code>
                <span className="text-muted-foreground">relevance_desc | created_desc | views_desc | likes_desc | name_asc</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ejemplo de Uso - Cápsulas Educativas</CardTitle>
          <CardDescription>Request y response de ejemplo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Request cURL</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(contentExampleRequest, 'content-example')}
              >
                {copiedContentExample ? (
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                Copiar
              </Button>
            </div>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
              {contentExampleRequest}
            </pre>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Response JSON</label>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
              {contentExampleResponse}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seguridad</CardTitle>
          <CardDescription>Consideraciones de seguridad y buenas prácticas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
            <p>Solo contenido con <code className="px-1 py-0.5 bg-muted rounded">is_public=true</code> es retornado</p>
          </div>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
            <p>Solo rutas con <code className="px-1 py-0.5 bg-muted rounded">status='published'</code> e <code className="px-1 py-0.5 bg-muted rounded">is_public=true</code> son retornadas</p>
          </div>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
            <p>El API Key debe mantenerse seguro y no compartirse públicamente</p>
          </div>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
            <p>Rate limiting automático de 60 req/min previene abuso</p>
          </div>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
            <p>Endpoints de solo lectura - no permiten modificaciones</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            API REST - Creación de Usuarios
          </CardTitle>
          <CardDescription>
            Endpoint para registro automatizado de usuarios desde sistemas externos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Endpoint URL</label>
              <Badge variant="outline" className="gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Activo
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                {`https://${projectId}.supabase.co/functions/v1/create-user-by-document`}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(`https://${projectId}.supabase.co/functions/v1/create-user-by-document`, 'user-endpoint')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Método HTTP</label>
            <Badge>POST</Badge>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Headers Requeridos</label>
            <code className="block px-3 py-2 bg-muted rounded text-sm">
              Content-Type: application/json
            </code>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Autenticación</label>
            <p className="text-sm text-muted-foreground">
              Endpoint público (no requiere API key) - Diseñado para integraciones institucionales
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Campos del Request Body (JSON)</label>
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">tipo_documento</code>
                <span className="text-muted-foreground">Tipo de documento (requerido) - Valores: RC, NES, PPT, TI, CC, CE, TE, DIE, DESC</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">numero_documento</code>
                <span className="text-muted-foreground">Número de documento (requerido)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">email</code>
                <span className="text-muted-foreground">Correo electrónico (opcional)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">full_name</code>
                <span className="text-muted-foreground">Nombre completo (opcional)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">nit_institucion</code>
                <span className="text-muted-foreground">NIT de la institución educativa (opcional)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">nombre_sede</code>
                <span className="text-muted-foreground">Nombre de la sede educativa (opcional)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">grado</code>
                <span className="text-muted-foreground">Grado del estudiante (opcional)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">grupo</code>
                <span className="text-muted-foreground">Grupo del estudiante (opcional)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">username</code>
                <span className="text-muted-foreground">Nombre de usuario (opcional)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">member_role</code>
                <span className="text-muted-foreground">Rol institucional: student, teacher, parent, admin (opcional, default: student)</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <label className="text-sm font-medium flex items-center gap-2">
              <Key className="w-4 h-4" />
              Lógica de Creación de Usuarios
            </label>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>1. Con correo electrónico:</strong></p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li>Email: El proporcionado en el campo <code className="px-1 py-0.5 bg-muted rounded">email</code></li>
                <li>Contraseña: El número de documento</li>
              </ul>
              
              <p className="mt-2"><strong>2. Sin correo electrónico:</strong></p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li>Email: <code className="px-1 py-0.5 bg-muted rounded">{"{numero_documento}@sedefy.com"}</code></li>
                <li>Contraseña: El número de documento</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Validaciones</label>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>✓ No permite crear usuarios duplicados (valida por número de documento)</p>
              <p>✓ Email automáticamente confirmado (no requiere verificación)</p>
              <p>✓ Retorna error 409 si ya existe un usuario con ese documento</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ejemplo de Uso - Creación de Usuarios</CardTitle>
          <CardDescription>Requests de ejemplo para ambos casos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <label className="text-sm font-medium">Caso 1: Usuario con correo</label>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Request cURL</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`curl -X POST "https://${projectId}.supabase.co/functions/v1/create-user-by-document" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tipo_documento": "CC",
    "numero_documento": "1234567890",
    "email": "estudiante@example.com",
    "full_name": "Juan Pérez",
    "username": "jperez"
  }'`}
              </pre>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Response exitoso</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`{
  "success": true,
  "user": {
    "id": "uuid-generado",
    "email": "estudiante@example.com",
    "numero_documento": "1234567890",
    "tipo_documento": "CC",
    "message": "Usuario creado exitosamente. Contraseña: número de documento"
  }
}`}
              </pre>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Caso 2: Usuario sin correo</label>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Request cURL</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`curl -X POST "https://${projectId}.supabase.co/functions/v1/create-user-by-document" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tipo_documento": "TI",
    "numero_documento": "9876543210",
    "full_name": "María García"
  }'`}
              </pre>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Response exitoso</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`{
  "success": true,
  "user": {
    "id": "uuid-generado",
    "email": "9876543210@sedefy.com",
    "numero_documento": "9876543210",
    "tipo_documento": "TI",
    "message": "Usuario creado exitosamente. Contraseña: número de documento"
  }
}`}
              </pre>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Respuestas de Error</label>
            
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Error 400 - Content-Type incorrecto</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`{
  "error": "Content-Type debe ser application/json"
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Error 400 - Body vacío o JSON inválido</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`{
  "error": "Body inválido o vacío. Debe enviar un JSON válido con los datos requeridos."
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Error 400 - Datos incompletos</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`{
  "error": "tipo_documento y numero_documento son requeridos"
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Error 409 - Usuario duplicado</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`{
  "error": "Ya existe un usuario con ese número de documento"
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk User Creation Endpoint Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            API REST - Creación Masiva de Usuarios
          </CardTitle>
          <CardDescription>
            Endpoint para crear hasta 3000 usuarios simultáneamente con autoverificación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Endpoint URL</label>
              <Badge variant="outline" className="gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Activo
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                {`https://${projectId}.supabase.co/functions/v1/create-users-bulk`}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(`https://${projectId}.supabase.co/functions/v1/create-users-bulk`, 'user-endpoint')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Método HTTP</label>
            <Badge>POST</Badge>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Headers Requeridos</label>
            <code className="block px-3 py-2 bg-muted rounded text-sm">
              Content-Type: application/json
            </code>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Timeout</label>
            <Badge variant="secondary">300 segundos (5 minutos)</Badge>
            <p className="text-xs text-muted-foreground">
              Configurado para soportar la creación de hasta 3000 usuarios
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Estructura del Request Body (JSON)</label>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`{
  "users": [
    {
      "tipo_documento": "CC",
      "numero_documento": "1234567890",
      "email": "usuario1@example.com",
      "full_name": "Juan Pérez",
      "username": "jperez"
    },
    {
      "tipo_documento": "TI",
      "numero_documento": "9876543210",
      "full_name": "María García"
    }
    // ... hasta 3000 usuarios
  ]
}`}
            </pre>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Campos por Usuario</label>
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">tipo_documento</code>
                <span className="text-muted-foreground">Tipo de documento (requerido) - Valores: RC, NES, PPT, TI, CC, CE, TE, DIE, DESC</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">numero_documento</code>
                <span className="text-muted-foreground">Número de documento (requerido)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">email</code>
                <span className="text-muted-foreground">Correo electrónico (opcional)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">full_name</code>
                <span className="text-muted-foreground">Nombre completo (opcional)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">username</code>
                <span className="text-muted-foreground">Nombre de usuario (opcional)</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
            <label className="text-sm font-medium flex items-center gap-2">
              ⚠️ Límites y Validaciones
            </label>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✓ Mínimo: 1 usuario</p>
              <p>✓ Máximo: 3000 usuarios por solicitud</p>
              <p>✓ No se crean usuarios duplicados (validación por número de documento)</p>
              <p>✓ Emails automáticamente confirmados</p>
              <p>✓ Si un usuario falla, continúa con los demás</p>
              <p>✓ Email predeterminado si no se provee: numero_documento@sedefy.com</p>
              <p>✓ Username predeterminado si no se provee: numero_documento</p>
              <p>✓ Contraseña: número de documento</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Respuesta Exitosa (200)</label>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`{
  "success": true,
  "summary": {
    "total": 100,
    "success": 98,
    "errors": 2
  },
  "results": [
    {
      "success": true,
      "user": {
        "id": "uuid-generado",
        "email": "usuario1@example.com",
        "numero_documento": "1234567890",
        "tipo_documento": "CC"
      },
      "numero_documento": "1234567890"
    },
    {
      "success": false,
      "error": "Ya existe un usuario con ese número de documento",
      "numero_documento": "9999999999"
    }
    // ... más resultados
  ]
}`}
            </pre>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Respuestas de Error</label>
            
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Error 400 - Content-Type incorrecto</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono">
{`{
  "error": "Content-Type debe ser application/json"
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Error 400 - Body inválido</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono">
{`{
  "error": "Body inválido o vacío. Debe enviar un JSON válido con un array de usuarios."
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Error 400 - users no es array</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono">
{`{
  "error": "El campo \\"users\\" debe ser un array de objetos con los datos de usuario"
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Error 400 - Array vacío</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono">
{`{
  "error": "Debe proporcionar al menos un usuario"
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Error 400 - Límite excedido</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono">
{`{
  "error": "No se pueden crear más de 3000 usuarios en una sola solicitud"
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ejemplo cURL - Creación Masiva</CardTitle>
          <CardDescription>Request de ejemplo con múltiples usuarios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`curl -X POST "https://${projectId}.supabase.co/functions/v1/create-users-bulk" \\
  -H "Content-Type: application/json" \\
  -d '{
    "users": [
      {
        "tipo_documento": "CC",
        "numero_documento": "1234567890",
        "email": "juan@example.com",
        "full_name": "Juan Pérez",
        "username": "jperez"
      },
      {
        "tipo_documento": "TI",
        "numero_documento": "9876543210",
        "full_name": "María García"
      },
      {
        "tipo_documento": "CE",
        "numero_documento": "5555555555",
        "email": "carlos@example.com",
        "full_name": "Carlos López"
      }
    ]
  }'`}
          </pre>
          
          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Este ejemplo muestra solo 3 usuarios, pero puedes enviar hasta 3000 en un solo request.
              El endpoint procesa cada usuario secuencialmente y retorna un resultado detallado para cada uno.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Auto-login Endpoint Documentation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Auto-login (SSO)
              </CardTitle>
              <CardDescription>
                Endpoint para iniciar sesión automáticamente usando un token cifrado
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-green-500 border-green-500">
              POST
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <ExternalLink className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Endpoint de Auto-login
              </p>
              <code className="block px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded text-sm break-all">
                https://{projectId}.supabase.co/functions/v1/auto-login
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  navigator.clipboard.writeText(`https://${projectId}.supabase.co/functions/v1/auto-login`);
                  setCopiedAutoLoginEndpoint(true);
                  setTimeout(() => setCopiedAutoLoginEndpoint(false), 2000);
                  toast({
                    title: "Endpoint copiado",
                    description: "La URL del endpoint ha sido copiada al portapapeles",
                  });
                }}
              >
                {copiedAutoLoginEndpoint ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copiar URL
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Headers Requeridos</label>
            <code className="block px-3 py-2 bg-muted rounded text-sm">
              Content-Type: application/json
            </code>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Autenticación</label>
            <p className="text-sm text-muted-foreground">
              Endpoint público (no requiere API key) - Los datos están protegidos por cifrado HMAC
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Body (JSON)</label>
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">token</code>
                <span className="text-muted-foreground">Token cifrado con formato: base64(data).base64(hmac)</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Generación del Token</label>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                El token debe generarse de la siguiente manera:
              </p>
              <div className="space-y-2 pl-4 border-l-2 border-muted">
                <p className="text-sm"><strong>1. Crear el payload:</strong></p>
                <pre className="p-3 bg-muted rounded text-xs font-mono overflow-x-auto">
{`{
  "email": "usuario@ejemplo.com",
  "password": "contraseña_del_usuario",
  "timestamp": 1234567890000
}

// O usando número de documento:
{
  "numero_documento": "12345678",
  "password": "contraseña_del_usuario",
  "timestamp": 1234567890000
}`}
                </pre>
                
                <p className="text-sm mt-3"><strong>2. Codificar en base64:</strong></p>
                <code className="block px-3 py-2 bg-muted rounded text-xs">
                  encodedData = base64(JSON.stringify(payload))
                </code>
                
                <p className="text-sm mt-3"><strong>3. Generar HMAC SHA-256 usando "tucanmistico" como clave secreta:</strong></p>
                <code className="block px-3 py-2 bg-muted rounded text-xs">
                  hmac = HMAC-SHA256(encodedData, "tucanmistico")
                </code>
                
                <p className="text-sm mt-3"><strong>4. Codificar el HMAC en base64:</strong></p>
                <code className="block px-3 py-2 bg-muted rounded text-xs">
                  encodedHmac = base64(hmac)
                </code>
                
                <p className="text-sm mt-3"><strong>5. Formar el token final:</strong></p>
                <code className="block px-3 py-2 bg-muted rounded text-xs">
                  token = encodedData + "." + encodedHmac
                </code>
              </div>
              
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800 mt-4">
                <p className="text-sm text-yellow-900 dark:text-yellow-100">
                  <strong>⚠️ Importante:</strong> El timestamp es opcional pero recomendado. Los tokens expiran después de 5 minutos si incluyen timestamp.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Funcionamiento</label>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>1. Si se proporciona <code className="px-1 py-0.5 bg-muted rounded">email</code>, se usa directamente para login</p>
              <p>2. Si se proporciona <code className="px-1 py-0.5 bg-muted rounded">numero_documento</code>, se busca el email asociado en la base de datos</p>
              <p>3. El password debe ser la contraseña actual del usuario</p>
              <p>4. Para usuarios creados con create-user-by-document, la contraseña es el número de documento</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">URL de Auto-login en la Aplicación</label>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Una vez generado el token, construye la URL de la siguiente manera:
              </p>
              <code className="block px-3 py-2 bg-muted rounded text-sm break-all">
                https://sedefy.com/auto-login?token=GENERATED_TOKEN&redirect=/profile
              </code>
              <div className="text-xs text-muted-foreground mt-2 space-y-1">
                <p>• <code className="px-1 py-0.5 bg-muted rounded">token</code>: El token generado (requerido)</p>
                <p>• <code className="px-1 py-0.5 bg-muted rounded">redirect</code>: Ruta de destino después del login (opcional, por defecto "/")</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Ejemplo de Solicitud</label>
            <div className="space-y-2">
              <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`curl -X POST "https://${projectId}.supabase.co/functions/v1/auto-login" \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "eyJlbWFpbCI6InVzdWFyaW9AZWplbXBsby5jb20iLCJwYXNzd29yZCI6Im1pX2NvbnRyYXNlw7FhIiwidGltZXN0YW1wIjoxNzM0NTY3ODkwMDAwfQ==.aGFzaF9kZWxfaG1hY19hcXVp"
  }'`}
              </pre>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Respuesta Exitosa</label>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`{
  "success": true,
  "session": {
    "access_token": "eyJhbGci...",
    "refresh_token": "v1_eyJhbGc...",
    "expires_in": 3600,
    "token_type": "bearer",
    "user": {
      "id": "uuid-here",
      "email": "usuario@ejemplo.com",
      ...
    }
  },
  "user": {
    "id": "uuid-here",
    "email": "usuario@ejemplo.com",
    ...
  }
}`}
            </pre>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Respuestas de Error</label>
            
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Error 400 - Token no proporcionado</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`{
  "error": "Token requerido"
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Error 400 - Formato de token inválido</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`{
  "error": "Formato de token inválido"
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Error 401 - Token manipulado o HMAC inválido</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`{
  "error": "Token inválido o manipulado"
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Error 401 - Token expirado</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`{
  "error": "Token expirado"
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Error 401 - Credenciales inválidas</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`{
  "error": "Credenciales inválidas",
  "details": "Invalid login credentials"
}`}
              </pre>
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
              🔒 Seguridad
            </h4>
            <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
              <li>El token incluye validación HMAC para evitar manipulación</li>
              <li>La clave secreta "tucanmistico" debe mantenerse privada</li>
              <li>Los tokens con timestamp expiran en 5 minutos</li>
              <li>Solo genera tokens desde sistemas de confianza</li>
              <li>Usa HTTPS para todas las peticiones</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            API - Envío de Resultados Académicos
          </CardTitle>
          <CardDescription>
            Endpoint para enviar resultados de asignaturas desde Sedefy Académico a Sedetok
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Endpoint URL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Endpoint URL</label>
              <Badge variant="outline" className="gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Activo
              </Badge>
            </div>
            <code className="block px-3 py-2 bg-muted rounded text-sm font-mono break-all">
              POST https://{projectId}.supabase.co/functions/v1/submit-subject-results
            </code>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <p className="text-sm text-muted-foreground">
              Este endpoint permite a Sedefy Académico enviar resultados de asignaturas (calificaciones, 
              evaluaciones, exámenes) que se integran automáticamente al perfil académico de los estudiantes 
              en Sedetok. Los datos se combinan con los quizzes internos para generar análisis completos 
              por áreas académicas y alimentar el perfil vocacional.
            </p>
          </div>

          {/* Características */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Características</label>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Procesamiento masivo: hasta 5000 resultados por solicitud</li>
              <li>Validación automática de usuarios por número de documento</li>
              <li>Mapeo inteligente de áreas académicas al sistema Sedetok</li>
              <li>Respuesta detallada con éxitos y errores individuales</li>
              <li>Timeout extendido (300s) para grandes volúmenes</li>
            </ul>
          </div>

          {/* Headers */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Headers Requeridos</label>
            <code className="block px-3 py-2 bg-muted rounded text-sm">
              Content-Type: application/json
            </code>
          </div>

          {/* Request Body */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Request Body</label>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`{
  "institution_id": "uuid-de-la-institución",
  "results": [
    {
      "numero_documento": "1234567890",
      "area_academica": "Matemáticas",
      "asignatura_nombre": "Álgebra Lineal",
      "asignatura_codigo": "MAT101",
      "periodo_academico": "2024-1",
      "score": 4.5,
      "max_score": 5.0,
      "passed": true,
      "docente_nombre": "Prof. Juan Pérez",
      "observaciones": "Excelente desempeño en ecuaciones diferenciales",
      "completed_at": "2024-01-15T10:30:00Z"
    },
    {
      "numero_documento": "9876543210",
      "area_academica": "Ciencias Naturales",
      "asignatura_nombre": "Biología Celular",
      "periodo_academico": "2024-1",
      "score": 3.8,
      "max_score": 5.0
    }
  ]
}`}
            </pre>
          </div>

          {/* Campos Detallados */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Campos del Body</label>
            
            <div className="space-y-4">
              <div className="border-l-2 border-primary pl-3">
                <p className="text-sm font-medium">institution_id</p>
                <p className="text-xs text-muted-foreground">
                  <Badge variant="secondary" className="mr-2">UUID</Badge>
                  <Badge variant="destructive" className="mr-2">Requerido</Badge>
                  Identificador único de la institución en Sedetok
                </p>
              </div>

              <div className="border-l-2 border-primary pl-3">
                <p className="text-sm font-medium">results</p>
                <p className="text-xs text-muted-foreground">
                  <Badge variant="secondary" className="mr-2">Array</Badge>
                  <Badge variant="destructive" className="mr-2">Requerido</Badge>
                  Array de objetos con los resultados académicos (mín: 1, máx: 5000)
                </p>
              </div>

              <div className="ml-4 space-y-3 border-l-2 border-muted pl-3">
                <p className="text-xs font-medium text-muted-foreground">Campos de cada resultado:</p>
                
                <div className="space-y-2 text-xs">
                  <div>
                    <code className="text-xs">numero_documento</code>
                    <Badge variant="destructive" className="ml-2 text-xs">Requerido</Badge>
                    <Badge variant="secondary" className="ml-1 text-xs">String</Badge>
                    <p className="text-muted-foreground mt-1">Número de documento del estudiante</p>
                  </div>

                  <div>
                    <code className="text-xs">area_academica</code>
                    <Badge variant="destructive" className="ml-2 text-xs">Requerido</Badge>
                    <Badge variant="secondary" className="ml-1 text-xs">String</Badge>
                    <p className="text-muted-foreground mt-1">Área académica (debe coincidir con el listado válido)</p>
                  </div>

                  <div>
                    <code className="text-xs">asignatura_nombre</code>
                    <Badge variant="destructive" className="ml-2 text-xs">Requerido</Badge>
                    <Badge variant="secondary" className="ml-1 text-xs">String</Badge>
                    <p className="text-muted-foreground mt-1">Nombre completo de la asignatura</p>
                  </div>

                  <div>
                    <code className="text-xs">periodo_academico</code>
                    <Badge variant="destructive" className="ml-2 text-xs">Requerido</Badge>
                    <Badge variant="secondary" className="ml-1 text-xs">String</Badge>
                    <p className="text-muted-foreground mt-1">Periodo académico (ej: "2024-1", "2025-A")</p>
                  </div>

                  <div>
                    <code className="text-xs">score</code>
                    <Badge variant="destructive" className="ml-2 text-xs">Requerido</Badge>
                    <Badge variant="secondary" className="ml-1 text-xs">Number</Badge>
                    <p className="text-muted-foreground mt-1">Calificación obtenida por el estudiante</p>
                  </div>

                  <div>
                    <code className="text-xs">max_score</code>
                    <Badge variant="destructive" className="ml-2 text-xs">Requerido</Badge>
                    <Badge variant="secondary" className="ml-1 text-xs">Number</Badge>
                    <p className="text-muted-foreground mt-1">Calificación máxima posible</p>
                  </div>

                  <div>
                    <code className="text-xs">asignatura_codigo</code>
                    <Badge variant="outline" className="ml-2 text-xs">Opcional</Badge>
                    <Badge variant="secondary" className="ml-1 text-xs">String</Badge>
                    <p className="text-muted-foreground mt-1">Código interno de la asignatura (ej: "MAT101")</p>
                  </div>

                  <div>
                    <code className="text-xs">passed</code>
                    <Badge variant="outline" className="ml-2 text-xs">Opcional</Badge>
                    <Badge variant="secondary" className="ml-1 text-xs">Boolean</Badge>
                    <p className="text-muted-foreground mt-1">Si aprobó la asignatura (default: true si score ≥ 60%)</p>
                  </div>

                  <div>
                    <code className="text-xs">nit_institucion</code>
                    <Badge variant="outline" className="ml-2 text-xs">Opcional</Badge>
                    <Badge variant="secondary" className="ml-1 text-xs">String</Badge>
                    <p className="text-muted-foreground mt-1">NIT de la institución educativa</p>
                  </div>

                  <div>
                    <code className="text-xs">nombre_sede</code>
                    <Badge variant="outline" className="ml-2 text-xs">Opcional</Badge>
                    <Badge variant="secondary" className="ml-1 text-xs">String</Badge>
                    <p className="text-muted-foreground mt-1">Nombre de la sede educativa</p>
                  </div>

                  <div>
                    <code className="text-xs">grado</code>
                    <Badge variant="outline" className="ml-2 text-xs">Opcional</Badge>
                    <Badge variant="secondary" className="ml-1 text-xs">String</Badge>
                    <p className="text-muted-foreground mt-1">Grado del estudiante (ej: "10", "11")</p>
                  </div>

                  <div>
                    <code className="text-xs">grupo</code>
                    <Badge variant="outline" className="ml-2 text-xs">Opcional</Badge>
                    <Badge variant="secondary" className="ml-1 text-xs">String</Badge>
                    <p className="text-muted-foreground mt-1">Grupo del estudiante (ej: "A", "B", "01")</p>
                  </div>

                  <div>
                    <code className="text-xs">docente_nombre</code>
                    <Badge variant="outline" className="ml-2 text-xs">Opcional</Badge>
                    <Badge variant="secondary" className="ml-1 text-xs">String</Badge>
                    <p className="text-muted-foreground mt-1">Nombre completo del docente</p>
                  </div>

                  <div>
                    <code className="text-xs">observaciones</code>
                    <Badge variant="outline" className="ml-2 text-xs">Opcional</Badge>
                    <Badge variant="secondary" className="ml-1 text-xs">String</Badge>
                    <p className="text-muted-foreground mt-1">Comentarios o notas adicionales</p>
                  </div>

                  <div>
                    <code className="text-xs">completed_at</code>
                    <Badge variant="outline" className="ml-2 text-xs">Opcional</Badge>
                    <Badge variant="secondary" className="ml-1 text-xs">ISO 8601</Badge>
                    <p className="text-muted-foreground mt-1">Fecha de finalización (default: fecha actual)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Áreas Académicas Válidas */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Áreas Académicas Válidas</label>
            <p className="text-xs text-muted-foreground mb-2">
              El campo <code className="px-1 py-0.5 bg-muted rounded">area_academica</code> debe ser uno de los siguientes valores:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Matemáticas</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Ciencias Naturales</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Lengua Castellana</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>Ciencias Sociales</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Lenguas Extranjeras</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Educación Física</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                <span>Educación Artística</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                <span>Tecnología e Informática</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <span>Ética y Valores</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                <span>Religión</span>
              </div>
            </div>
          </div>

          {/* Respuesta Exitosa */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Respuesta Exitosa (200)</label>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`{
  "success": true,
  "total": 100,
  "processed": 98,
  "errors": 2,
  "details": {
    "processed": [
      {
        "numero_documento": "1234567890",
        "status": "success"
      },
      {
        "numero_documento": "9876543210",
        "status": "success"
      }
      // ... más resultados exitosos
    ],
    "errors": [
      {
        "numero_documento": "0000000000",
        "error": "Usuario no encontrado con ese número de documento"
      },
      {
        "numero_documento": "1111111111",
        "error": "Campos requeridos faltantes: area_academica"
      }
    ]
  }
}`}
            </pre>
          </div>

          {/* Códigos de Error */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Códigos de Error</label>
            
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 border rounded">
                <Badge variant="destructive">400</Badge>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Bad Request</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Content-Type debe ser application/json</li>
                    <li>• Body inválido o vacío</li>
                    <li>• Campo institution_id o results faltante</li>
                    <li>• results no es un array</li>
                    <li>• Array de results está vacío</li>
                    <li>• Más de 5000 resultados en una solicitud</li>
                  </ul>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs">
{`{
  "error": "Content-Type debe ser application/json"
}`}
                  </pre>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded">
                <Badge variant="destructive">404</Badge>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Not Found</p>
                  <p className="text-xs text-muted-foreground">
                    La institución especificada no existe en el sistema
                  </p>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs">
{`{
  "error": "Institución no encontrada"
}`}
                  </pre>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded">
                <Badge variant="destructive">500</Badge>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Internal Server Error</p>
                  <p className="text-xs text-muted-foreground">
                    Error interno del servidor con detalles adicionales
                  </p>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs">
{`{
  "error": "Error interno del servidor",
  "details": "Descripción específica del error"
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Ejemplos de Uso */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Ejemplos de Uso</label>
            
            <div className="space-y-4">
              {/* cURL */}
              <div className="space-y-2">
                <p className="text-xs font-medium">cURL</p>
                <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`curl -X POST 'https://${projectId}.supabase.co/functions/v1/submit-subject-results' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "institution_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "results": [
      {
        "numero_documento": "1234567890",
        "area_academica": "Matemáticas",
        "asignatura_nombre": "Cálculo Diferencial",
        "periodo_academico": "2024-1",
        "score": 4.5,
        "max_score": 5.0,
        "passed": true,
        "nit_institucion": "900123456",
        "nombre_sede": "Sede Principal",
        "grado": "11",
        "grupo": "A",
        "docente_nombre": "Prof. María García"
      }
    ]
  }'`}
                </pre>
              </div>

              {/* JavaScript/TypeScript */}
              <div className="space-y-2">
                <p className="text-xs font-medium">JavaScript / TypeScript</p>
                <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`const response = await fetch(
  'https://${projectId}.supabase.co/functions/v1/submit-subject-results',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      institution_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      results: [
        {
          numero_documento: '1234567890',
          area_academica: 'Matemáticas',
          asignatura_nombre: 'Cálculo Diferencial',
          periodo_academico: '2024-1',
          score: 4.5,
          max_score: 5.0,
          passed: true
        }
      ]
    })
  }
);

const data = await response.json();
console.log(\`Procesados: \${data.processed}, Errores: \${data.errors}\`);`}
                </pre>
              </div>

              {/* Python */}
              <div className="space-y-2">
                <p className="text-xs font-medium">Python</p>
                <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`import requests
import json

url = 'https://${projectId}.supabase.co/functions/v1/submit-subject-results'
headers = {'Content-Type': 'application/json'}
payload = {
    'institution_id': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'results': [
        {
            'numero_documento': '1234567890',
            'area_academica': 'Matemáticas',
            'asignatura_nombre': 'Cálculo Diferencial',
            'periodo_academico': '2024-1',
            'score': 4.5,
            'max_score': 5.0,
            'passed': True
        }
    ]
}

response = requests.post(url, headers=headers, json=payload)
data = response.json()
print(f"Procesados: {data['processed']}, Errores: {data['errors']}")`}
                </pre>
              </div>

              {/* PHP */}
              <div className="space-y-2">
                <p className="text-xs font-medium">PHP</p>
                <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`<?php
$url = 'https://${projectId}.supabase.co/functions/v1/submit-subject-results';
$data = [
    'institution_id' => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'results' => [
        [
            'numero_documento' => '1234567890',
            'area_academica' => 'Matemáticas',
            'asignatura_nombre' => 'Cálculo Diferencial',
            'periodo_academico' => '2024-1',
            'score' => 4.5,
            'max_score' => 5.0,
            'passed' => true
        ]
    ]
];

$options = [
    'http' => [
        'header'  => "Content-Type: application/json\\r\\n",
        'method'  => 'POST',
        'content' => json_encode($data)
    ]
];

$context  = stream_context_create($options);
$result = file_get_contents($url, false, $context);
$response = json_decode($result, true);

echo "Procesados: {$response['processed']}, Errores: {$response['errors']}";
?>`}
                </pre>
              </div>
            </div>
          </div>

          {/* Mejores Prácticas */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
              <span className="text-lg">💡</span>
              Mejores Prácticas
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">•</span>
                <span><strong>Lotes pequeños:</strong> Envía máximo 1000 resultados por solicitud para mejor rendimiento y facilitar debugging</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">•</span>
                <span><strong>Validación previa:</strong> Verifica que los usuarios existan en Sedetok antes de enviar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">•</span>
                <span><strong>Áreas estandarizadas:</strong> Usa exactamente los nombres de áreas del listado válido</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">•</span>
                <span><strong>Manejo de errores:</strong> Revisa el array <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded">details.errors</code> para identificar fallos específicos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">•</span>
                <span><strong>Reintentos:</strong> Reintenta solo los resultados que fallaron, no todo el lote</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">•</span>
                <span><strong>Logging:</strong> Guarda los IDs de transacción y respuestas para auditoría</span>
              </li>
            </ul>
          </div>

          {/* Integración Automática */}
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <h4 className="font-medium text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
              <span className="text-lg">🔄</span>
              Integración Automática
            </h4>
            <p className="text-sm text-green-800 dark:text-green-200 mb-3">
              Los resultados enviados se integran automáticamente en el sistema Sedetok:
            </p>
            <ul className="text-sm text-green-800 dark:text-green-200 space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">✓</span>
                <span>Aparecen en el <strong>perfil académico del estudiante</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">✓</span>
                <span>Se combinan con <strong>quizzes internos</strong> para análisis completo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">✓</span>
                <span>Alimentan el <strong>radar académico por áreas</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">✓</span>
                <span>Influyen en el <strong>perfil vocacional</strong> del estudiante</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">✓</span>
                <span>Visibles para <strong>docentes y administradores</strong> institucionales</span>
              </li>
            </ul>
          </div>

          {/* Notas Importantes */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              Notas Importantes
            </h4>
            <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">!</span>
                <span>Los estudiantes <strong>deben existir previamente</strong> en Sedetok (usar endpoint de creación de usuarios)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">!</span>
                <span>El campo <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900 rounded">passed</code> se calcula automáticamente como <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900 rounded">true</code> si score ≥ 60% del max_score</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">!</span>
                <span>El timeout es de 300 segundos - para más de 3000 resultados, divide en múltiples solicitudes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">!</span>
                <span>Los resultados no sobrescriben datos existentes - se agregan como nuevos registros</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">!</span>
                <span>La respuesta <strong>siempre es 200</strong> si la solicitud es válida - revisa <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900 rounded">details.errors</code> para fallos individuales</span>
              </li>
            </ul>
          </div>

          {/* Soporte */}
          <div className="p-4 bg-muted rounded-lg border">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <span className="text-lg">🆘</span>
              ¿Necesitas ayuda?
            </h4>
            <p className="text-sm text-muted-foreground">
              Si encuentras problemas con la integración o tienes dudas sobre el formato de datos, 
              contacta al equipo de Sedetok para soporte técnico.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Chat Login JWT */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API - Chat Login (JWT)
              </CardTitle>
              <CardDescription>
                Endpoint para acceder al chat escolar mediante un token JWT firmado. Crea usuarios, asigna instituciones, grupos académicos y dirige al chat automáticamente.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-green-500 border-green-500">
              POST / GET
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Endpoint */}
          <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <ExternalLink className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Endpoint del Chat Login
              </p>
              <code className="block px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded text-sm break-all">
                https://{projectId}.supabase.co/functions/v1/chat-login
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  navigator.clipboard.writeText(`https://${projectId}.supabase.co/functions/v1/chat-login`);
                  toast({
                    title: "Endpoint copiado",
                    description: "La URL del endpoint ha sido copiada al portapapeles",
                  });
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar URL
              </Button>
            </div>
          </div>

          {/* URL de acceso */}
          <div className="space-y-2">
            <label className="text-sm font-medium">URL de Acceso al Chat</label>
            <p className="text-sm text-muted-foreground">
              Los usuarios acceden al chat visitando la siguiente URL con el token JWT como parámetro:
            </p>
            <code className="block px-3 py-2 bg-muted rounded text-sm break-all">
              https://sedefy.com/chat/login?token=JWT_TOKEN_AQUI
            </code>
            <p className="text-xs text-muted-foreground mt-1">
              La aplicación procesa el token, crea/autentica al usuario y lo redirige al chat automáticamente.
            </p>
          </div>

          {/* Autenticación */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Autenticación</label>
            <p className="text-sm text-muted-foreground">
              Endpoint público. La seguridad está garantizada por la firma HMAC-SHA256 del JWT. El token se verifica con el secret <code className="px-1 py-0.5 bg-muted rounded">CHAT_JWT_SECRET</code> configurado en el servidor.
            </p>
          </div>

          {/* Payload JWT */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Payload del JWT</label>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`{
  "email": "usuario@colegio.edu.co",        // Requerido
  "full_name": "Juan Pérez",                // Opcional
  "member_role": "teacher",                  // Requerido: teacher | student | admin | coordinator | parent
  "institution_name": "Colegio ABC",         // Opcional: nombre de la institución (se busca o crea)
  "institution_id": "uuid-de-institucion",   // Opcional: ID directo (tiene prioridad sobre nombre)
  "numero_documento": "123456",              // Opcional
  "password": "custom_password",             // Opcional (default: Sede_{numero_documento})
  "grupo": "5°A",                            // Opcional: grupo académico del estudiante
  "curso_nombre": "2025",                    // Opcional: año o nombre del curso
  "es_director_grupo": false,                // Opcional: si el docente es director del grupo
  "director_grupo": "5°A",                   // Opcional: grupo del que es director (para docentes)
  "exp": 1750000000                          // Requerido: expiración UNIX timestamp
}`}
            </pre>
          </div>

          {/* Campos detallados */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Detalle de Campos</label>
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">email</code>
                <span className="text-muted-foreground">Correo electrónico del usuario (requerido)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">full_name</code>
                <span className="text-muted-foreground">Nombre completo (se usa al crear el perfil)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">member_role</code>
                <span className="text-muted-foreground">Rol en la institución: teacher, student, admin, coordinator, parent</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">institution_name</code>
                <span className="text-muted-foreground">Nombre de la institución. Si no existe, se crea automáticamente</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">institution_id</code>
                <span className="text-muted-foreground">UUID de la institución (tiene prioridad sobre institution_name)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">grupo</code>
                <span className="text-muted-foreground">Nombre del grupo académico (ej: "5°A", "10°B"). Asigna al usuario como estudiante</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">director_grupo</code>
                <span className="text-muted-foreground">Si member_role es "teacher", asigna al docente como director de ese grupo</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">exp</code>
                <span className="text-muted-foreground">Timestamp UNIX de expiración del token</span>
              </div>
            </div>
          </div>

          {/* Lógica de funcionamiento */}
          <div className="space-y-2 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <label className="text-sm font-medium flex items-center gap-2">
              <Key className="w-4 h-4" />
              Lógica de Procesamiento
            </label>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>1. Verificación del token:</strong> Se verifica la firma HMAC-SHA256 y la expiración.</p>
              <p><strong>2. Usuario:</strong> Si el email ya existe, se reutiliza. Si no, se crea un nuevo usuario con email confirmado.</p>
              <p><strong>3. Contraseña:</strong> Si no se proporciona <code className="px-1 py-0.5 bg-muted rounded">password</code>, se genera como <code className="px-1 py-0.5 bg-muted rounded">Sede_{'{numero_documento}'}</code>.</p>
              <p><strong>4. Institución:</strong> Se busca por ID o nombre. Si no existe, se crea con el usuario como admin.</p>
              <p><strong>5. Membresía:</strong> Se agrega al usuario como miembro de la institución con el rol indicado.</p>
              <p><strong>6. Grupo académico:</strong> Si se indica <code className="px-1 py-0.5 bg-muted rounded">grupo</code>, se busca/crea el grupo y se agrega al usuario.</p>
              <p><strong>7. Director de grupo:</strong> Si el docente tiene <code className="px-1 py-0.5 bg-muted rounded">director_grupo</code>, se le asigna como director (esto crea automáticamente un chat grupal).</p>
              <p><strong>8. Auto-login:</strong> Se retornan las credenciales para que el cliente inicie sesión automáticamente.</p>
            </div>
          </div>

          {/* Generación del JWT */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Generación del JWT</label>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                El JWT debe firmarse con el algoritmo HMAC-SHA256 (HS256) usando el secret compartido <code className="px-1 py-0.5 bg-muted rounded">CHAT_JWT_SECRET</code>.
              </p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">JavaScript/Node.js (con jsonwebtoken)</h4>
                  <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`const jwt = require('jsonwebtoken');

const SECRET = 'tu_chat_jwt_secret';

function generarTokenChat(userData) {
  const payload = {
    email: userData.email,
    full_name: userData.full_name,
    member_role: userData.member_role,  // teacher | student | admin | coordinator | parent
    institution_name: userData.institution_name,
    numero_documento: userData.numero_documento,
    grupo: userData.grupo || null,
    director_grupo: userData.director_grupo || null,
    curso_nombre: userData.curso_nombre || null,
  };

  return jwt.sign(payload, SECRET, { expiresIn: '10m' });
}

// Ejemplo: Crear URL de acceso al chat para un estudiante
const token = generarTokenChat({
  email: 'estudiante@colegio.edu.co',
  full_name: 'María García',
  member_role: 'student',
  institution_name: 'Colegio ABC',
  numero_documento: '1234567890',
  grupo: '5°A',
});

const chatUrl = \`https://sedefy.com/chat/login?token=\${token}\`;
console.log(chatUrl);`}
                  </pre>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Python (con PyJWT)</h4>
                  <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`import jwt
import time

SECRET = 'tu_chat_jwt_secret'

def generar_token_chat(user_data):
    payload = {
        'email': user_data['email'],
        'full_name': user_data.get('full_name'),
        'member_role': user_data['member_role'],
        'institution_name': user_data.get('institution_name'),
        'numero_documento': user_data.get('numero_documento'),
        'grupo': user_data.get('grupo'),
        'director_grupo': user_data.get('director_grupo'),
        'exp': int(time.time()) + 600  # 10 minutos
    }
    return jwt.encode(payload, SECRET, algorithm='HS256')

# Ejemplo: Docente director de grupo
token = generar_token_chat({
    'email': 'profe@colegio.edu.co',
    'full_name': 'Carlos López',
    'member_role': 'teacher',
    'institution_name': 'Colegio ABC',
    'numero_documento': '9876543',
    'director_grupo': '10°B',
    'curso_nombre': '2025'
})

chat_url = f'https://sedefy.com/chat/login?token={token}'
print(chat_url)`}
                  </pre>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">PHP (con firebase/php-jwt)</h4>
                  <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`<?php
use Firebase\\JWT\\JWT;

$secret = 'tu_chat_jwt_secret';

function generarTokenChat($userData) {
    global $secret;
    
    $payload = [
        'email' => $userData['email'],
        'full_name' => $userData['full_name'] ?? null,
        'member_role' => $userData['member_role'],
        'institution_name' => $userData['institution_name'] ?? null,
        'numero_documento' => $userData['numero_documento'] ?? null,
        'grupo' => $userData['grupo'] ?? null,
        'director_grupo' => $userData['director_grupo'] ?? null,
        'exp' => time() + 600  // 10 minutos
    ];
    
    return JWT::encode($payload, $secret, 'HS256');
}

// Ejemplo: Padre de familia
$token = generarTokenChat([
    'email' => 'padre@gmail.com',
    'full_name' => 'Pedro Martínez',
    'member_role' => 'parent',
    'institution_name' => 'Colegio ABC',
    'grupo' => '5°A'
]);

$chatUrl = "https://sedefy.com/chat/login?token=$token";
echo $chatUrl;
?>`}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Respuesta exitosa */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Respuesta Exitosa (200)</label>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
{`{
  "success": true,
  "user_id": "uuid-del-usuario",
  "email": "usuario@colegio.edu.co",
  "redirect": "/chat",
  "auto_login": {
    "email": "usuario@colegio.edu.co",
    "password": "Sede_123456"
  }
}`}
            </pre>
            <p className="text-xs text-muted-foreground">
              El campo <code className="px-1 py-0.5 bg-muted rounded">auto_login</code> contiene las credenciales para que el cliente inicie sesión automáticamente.
            </p>
          </div>

          {/* Errores */}
          <div className="space-y-4">
            <label className="text-sm font-medium">Respuestas de Error</label>
            
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Error 400 - Token no proporcionado</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono">
{`{ "error": "Token requerido" }`}
              </pre>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Error 400 - Email faltante en el token</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono">
{`{ "error": "Email requerido en el token" }`}
              </pre>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Error 400 - Token expirado o firma inválida</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono">
{`{ "error": "Token expired" }
{ "error": "Invalid signature" }`}
              </pre>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Error 500 - Secret no configurado</label>
              <pre className="p-4 bg-muted rounded text-xs font-mono">
{`{ "error": "JWT secret not configured" }`}
              </pre>
            </div>
          </div>

          {/* Escenarios de uso */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Escenarios de Uso</label>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-foreground mb-1">📚 Estudiante accede al chat</p>
                <p>El sistema académico genera un JWT con <code className="px-1 py-0.5 bg-muted rounded">member_role: "student"</code>, <code className="px-1 py-0.5 bg-muted rounded">grupo: "5°A"</code>. El estudiante se agrega automáticamente al grupo académico y al chat grupal del director.</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-foreground mb-1">👨‍🏫 Docente director de grupo</p>
                <p>JWT con <code className="px-1 py-0.5 bg-muted rounded">member_role: "teacher"</code>, <code className="px-1 py-0.5 bg-muted rounded">director_grupo: "10°B"</code>. Se crea automáticamente un chat grupal con todos los miembros del grupo.</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-foreground mb-1">👨‍👩‍👧 Padre de familia</p>
                <p>JWT con <code className="px-1 py-0.5 bg-muted rounded">member_role: "parent"</code>, <code className="px-1 py-0.5 bg-muted rounded">grupo: "5°A"</code>. El padre se agrega como miembro del grupo con rol "parent" y puede comunicarse con el director.</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-foreground mb-1">🏫 Admin institucional</p>
                <p>JWT con <code className="px-1 py-0.5 bg-muted rounded">member_role: "admin"</code>. Puede ver los chats de docentes y coordinadores, y buscar usuarios de su institución.</p>
              </div>
            </div>
          </div>

          {/* Seguridad */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
              🔒 Seguridad
            </h4>
            <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
              <li>Los JWT se verifican con HMAC-SHA256 — no pueden ser falsificados sin el secret</li>
              <li>Siempre incluya <code className="px-1 py-0.5 bg-amber-200/50 rounded">exp</code> para evitar reutilización de tokens</li>
              <li>Tiempo de expiración recomendado: 10 minutos</li>
              <li>El CHAT_JWT_SECRET debe mantenerse privado y seguro</li>
              <li>Las contraseñas de los usuarios creados son temporales — invitar al usuario a cambiarla</li>
              <li>Use HTTPS para todas las peticiones</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Sincronización Batch de Instituciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            API REST - Sincronización Batch de Institución
          </CardTitle>
          <CardDescription>
            Endpoint para crear/sincronizar institución, grupos académicos, usuarios (admin, docentes, coordinadores, estudiantes, padres) y chats grupales en un solo request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Endpoint URL</label>
              <Badge variant="outline" className="gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Activo
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                {`https://${projectId}.supabase.co/functions/v1/sync-institution-batch`}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(`https://${projectId}.supabase.co/functions/v1/sync-institution-batch`, 'endpoint')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Método HTTP</label>
            <Badge>POST</Badge>
          </div>

          {/* Payload Schema */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Esquema del Payload JSON</label>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`{
  "institution": {
    "name": "Colegio San José",          // requerido
    "nit": "900123456",                  // opcional - busca institución existente
    "codigo_dane": "123456789012",       // opcional
    "admin_documento": "1001234567",     // requerido - No. documento del admin
    "address": "Calle 10 #5-20",        // opcional
    "city": "Bogotá",                   // opcional
    "country": "Colombia",              // opcional
    "contact_email": "info@colegio.edu",// opcional
    "contact_phone": "3001234567",      // opcional
    "description": "Descripción",       // opcional
    "logo_url": "https://...",          // opcional
    "cover_url": "https://..."          // opcional
  },
  "sedes": [                             // opcional - sedes/campus
    {
      "name": "Sede Norte",              // requerido
      "code": "SN01",                    // opcional
      "address": "Calle 50 #10-30",     // opcional
      "city": "Bogotá",                 // opcional
      "coordinator_documento": "1005555555" // opcional - doc. del coordinador
    },
    { "name": "Sede Sur", "address": "Av 68 #20-10" }
  ],
  "groups": [                            // opcional
    {
      "name": "5°A",                     // requerido
      "course_name": "Quinto",           // opcional
      "academic_year": "2025",           // opcional
      "director_documento": "1009876543",// opcional - doc. del director
      "sede": "Sede Norte"               // opcional - nombre de la sede
    },
    { "name": "5°A", "course_name": "Quinto", "sede": "Sede Sur" }
  ],
  "users": [                             // requerido - max 5000
    {
      "numero_documento": "1001234567",  // requerido
      "tipo_documento": "CC",            // opcional (CC por defecto)
      "full_name": "Juan Admin",         // opcional
      "email": "admin@colegio.edu",      // opcional (se genera automático)
      "member_role": "admin",            // requerido: admin|teacher|coordinator|student|parent
      "grupo": null,                     // opcional - nombre del grupo
      "sede": null,                      // opcional - nombre de la sede (requerido si hay grupos con mismo nombre en distintas sedes)
      "es_director_grupo": false         // opcional
    },
    {
      "numero_documento": "1009876543",
      "full_name": "María Profesora",
      "member_role": "teacher",
      "grupo": "5°A",
      "sede": "Sede Norte",
      "es_director_grupo": true
    },
    {
      "numero_documento": "1012345678",
      "tipo_documento": "TI",
      "full_name": "Pedro Estudiante",
      "member_role": "student",
      "grupo": "5°A",
      "sede": "Sede Norte"
    },
    {
      "numero_documento": "1099999999",
      "full_name": "Ana Estudiante",
      "member_role": "student",
      "grupo": "5°A",
      "sede": "Sede Sur"
    }
  ]
}`}
            </pre>
          </div>

          {/* Roles */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Roles disponibles (member_role)</label>
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs min-w-[100px]">admin</code>
                <span className="text-muted-foreground">Administrador de la institución</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs min-w-[100px]">teacher</code>
                <span className="text-muted-foreground">Docente</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs min-w-[100px]">coordinator</code>
                <span className="text-muted-foreground">Coordinador académico</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs min-w-[100px]">student</code>
                <span className="text-muted-foreground">Estudiante</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs min-w-[100px]">parent</code>
                <span className="text-muted-foreground">Padre de familia</span>
              </div>
            </div>
          </div>

          {/* Response */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Response de éxito</label>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`{
  "success": true,
  "institution_id": "uuid-de-la-institución",
  "log": {
    "users_created": 45,
    "users_updated": 3,
    "users_skipped": 0,
    "groups_created": 6,
    "group_members_added": 180,
    "chat_conversations_created": 7,
    "errors": []
  }
}`}
            </pre>
          </div>

          {/* Comportamiento */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Comportamiento</label>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                <p><strong>Idempotente:</strong> Si la institución ya existe (por NIT o nombre), se actualiza en lugar de duplicar</p>
              </div>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                <p><strong>Usuarios sin email:</strong> Se genera automáticamente <code className="px-1 py-0.5 bg-muted rounded">{'{documento}@sedefy.local'}</code></p>
              </div>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                <p><strong>Contraseña:</strong> Siempre es el número de documento del usuario</p>
              </div>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                <p><strong>Chats automáticos:</strong> Se crea un chat grupal por cada grupo académico + un chat institucional para staff</p>
              </div>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                <p><strong>Participantes:</strong> Todos los miembros del grupo se agregan automáticamente al chat correspondiente</p>
              </div>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                <p><strong>Procesamiento batch:</strong> Los usuarios se procesan en lotes de 50 en paralelo. Máximo 5000 usuarios por request</p>
              </div>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                <p><strong>Sedes:</strong> Los grupos pueden pertenecer a una sede específica. Dos grupos con el mismo nombre en sedes distintas se crean por separado. Usuarios se asignan al grupo correcto indicando <code className="px-1 py-0.5 bg-muted rounded">sede</code> en el payload</p>
              </div>
            </div>
          </div>

          {/* Ejemplos de implementación */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Ejemplo cURL</label>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`curl -X POST "${`https://${projectId}.supabase.co/functions/v1/sync-institution-batch`}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "institution": {
      "name": "Colegio San José",
      "nit": "900123456",
      "admin_documento": "1001234567",
      "city": "Bogotá"
    },
    "sedes": [
      { "name": "Sede Norte", "code": "SN01", "address": "Calle 50 #10-30" },
      { "name": "Sede Sur", "address": "Av 68 #20-10" }
    ],
    "groups": [
      { "name": "5°A", "course_name": "Quinto", "sede": "Sede Norte", "director_documento": "1009876543" },
      { "name": "5°A", "course_name": "Quinto", "sede": "Sede Sur" },
      { "name": "6°B", "course_name": "Sexto", "sede": "Sede Norte" }
    ],
    "users": [
      { "numero_documento": "1001234567", "full_name": "Admin", "member_role": "admin", "email": "admin@colegio.edu" },
      { "numero_documento": "1009876543", "full_name": "Prof. María", "member_role": "teacher", "grupo": "5°A", "sede": "Sede Norte", "es_director_grupo": true },
      { "numero_documento": "1012345678", "full_name": "Pedro Gómez", "member_role": "student", "grupo": "5°A", "sede": "Sede Norte", "tipo_documento": "TI" },
      { "numero_documento": "1099999999", "full_name": "Ana López", "member_role": "student", "grupo": "5°A", "sede": "Sede Sur" },
      { "numero_documento": "1050001234", "full_name": "Padre de Pedro", "member_role": "parent", "grupo": "5°A", "sede": "Sede Norte" }
    ]
  }'`}
            </pre>
          </div>

          {/* Node.js */}
          <div className="space-y-2">
            <label className="text-sm font-medium">JavaScript (Node.js)</label>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`const syncInstitution = async (data) => {
  const response = await fetch(
    '${`https://${projectId}.supabase.co/functions/v1/sync-institution-batch`}',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  return await response.json();
};

// Ejemplo: sincronizar desde base de datos escolar
const students = await db.query('SELECT * FROM estudiantes WHERE activo = true');
const teachers = await db.query('SELECT * FROM docentes WHERE activo = true');

const payload = {
  institution: {
    name: 'Colegio San José',
    nit: '900123456',
    admin_documento: '1001234567',
    city: 'Bogotá',
  },
  sedes: [
    { name: 'Sede Norte', code: 'SN01', address: 'Calle 50 #10-30' },
    { name: 'Sede Sur', address: 'Av 68 #20-10' },
  ],
  groups: [
    { name: '5°A', course_name: 'Quinto', academic_year: '2025', sede: 'Sede Norte', director_documento: '1009876543' },
    { name: '5°A', course_name: 'Quinto', academic_year: '2025', sede: 'Sede Sur' },
    { name: '6°B', course_name: 'Sexto', academic_year: '2025', sede: 'Sede Norte' },
  ],
  users: [
    ...teachers.map(t => ({
      numero_documento: t.documento,
      full_name: t.nombre,
      email: t.email,
      member_role: 'teacher',
      grupo: t.grupo_asignado,
      sede: t.sede,
      es_director_grupo: t.es_director,
    })),
    ...students.map(s => ({
      numero_documento: s.documento,
      tipo_documento: s.tipo_documento || 'TI',
      full_name: s.nombre,
      member_role: 'student',
      grupo: s.grupo,
      sede: s.sede,
    })),
  ],
};

const result = await syncInstitution(payload);
console.log('Sincronización:', result.log);`}
            </pre>
          </div>

          {/* Python */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Python</label>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`import requests

SYNC_URL = "${`https://${projectId}.supabase.co/functions/v1/sync-institution-batch`}"

def sync_institution(data):
    response = requests.post(SYNC_URL, json=data)
    response.raise_for_status()
    return response.json()

# Ejemplo completo
payload = {
    "institution": {
        "name": "Colegio San José",
        "nit": "900123456",
        "admin_documento": "1001234567",
        "city": "Bogotá",
        "country": "Colombia"
    },
    "sedes": [
        {"name": "Sede Norte", "code": "SN01", "address": "Calle 50 #10-30"},
        {"name": "Sede Sur", "address": "Av 68 #20-10"}
    ],
    "groups": [
        {"name": "5°A", "course_name": "Quinto", "academic_year": "2025", "sede": "Sede Norte", "director_documento": "1009876543"},
        {"name": "5°A", "course_name": "Quinto", "academic_year": "2025", "sede": "Sede Sur"},
        {"name": "6°B", "course_name": "Sexto", "academic_year": "2025", "sede": "Sede Norte"}
    ],
    "users": [
        {"numero_documento": "1001234567", "full_name": "Admin", "member_role": "admin"},
        {"numero_documento": "1009876543", "full_name": "Prof. María", "member_role": "teacher", "grupo": "5°A", "sede": "Sede Norte", "es_director_grupo": True},
        {"numero_documento": "1012345678", "full_name": "Pedro Gómez", "member_role": "student", "grupo": "5°A", "sede": "Sede Norte", "tipo_documento": "TI"},
        {"numero_documento": "1099999999", "full_name": "Ana López", "member_role": "student", "grupo": "5°A", "sede": "Sede Sur"},
        {"numero_documento": "1050001234", "full_name": "Mamá de Pedro", "member_role": "parent", "grupo": "5°A", "sede": "Sede Norte"}
    ]
}

result = sync_institution(payload)
print(f"Creados: {result['log']['users_created']}, Actualizados: {result['log']['users_updated']}")
print(f"Chats creados: {result['log']['chat_conversations_created']}")`}
            </pre>
          </div>

          {/* PHP */}
          <div className="space-y-2">
            <label className="text-sm font-medium">PHP</label>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`<?php
$syncUrl = "${`https://${projectId}.supabase.co/functions/v1/sync-institution-batch`}";

function syncInstitution($data) {
    global $syncUrl;
    
    $ch = curl_init($syncUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 300); // 5 minutos para batches grandes
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Ejemplo: sincronizar desde SEDE Académico
$estudiantes = $db->query("SELECT * FROM estudiantes WHERE estado = 'activo'");
$docentes = $db->query("SELECT * FROM docentes WHERE estado = 'activo'");

$users = [];
foreach ($docentes as $d) {
    $users[] = [
        'numero_documento' => $d['documento'],
        'full_name' => $d['nombre'],
        'email' => $d['email'],
        'member_role' => 'teacher',
        'grupo' => $d['grupo_asignado'],
        'sede' => $d['sede'],
        'es_director_grupo' => (bool) $d['es_director']
    ];
}
foreach ($estudiantes as $e) {
    $users[] = [
        'numero_documento' => $e['documento'],
        'tipo_documento' => $e['tipo_doc'] ?? 'TI',
        'full_name' => $e['nombre'],
        'member_role' => 'student',
        'grupo' => $e['grupo'],
        'sede' => $e['sede']
    ];
}

$result = syncInstitution([
    'institution' => [
        'name' => 'Colegio San José',
        'nit' => '900123456',
        'admin_documento' => '1001234567',
    ],
    'sedes' => [
        ['name' => 'Sede Norte', 'code' => 'SN01', 'address' => 'Calle 50 #10-30'],
        ['name' => 'Sede Sur', 'address' => 'Av 68 #20-10'],
    ],
    'groups' => [
        ['name' => '5°A', 'course_name' => 'Quinto', 'academic_year' => '2025', 'sede' => 'Sede Norte'],
        ['name' => '5°A', 'course_name' => 'Quinto', 'academic_year' => '2025', 'sede' => 'Sede Sur'],
    ],
    'users' => $users
]);

echo "Sincronización: " . json_encode($result['log']);
?>`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Login por Documento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Auto-Login por Número de Documento
          </CardTitle>
          <CardDescription>
            Acceso automático vía URL para usuarios sincronizados — ideal para integración con sistemas escolares
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">URL de Acceso Directo</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                {`https://sedefy.com/auto-login?documento={NUMERO_DOCUMENTO}&redirect=/chat`}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard('https://sedefy.com/auto-login?documento={NUMERO_DOCUMENTO}&redirect=/chat', 'auto-login-endpoint')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Parámetros de URL</label>
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">documento</code>
                <span className="text-muted-foreground">Número de documento del usuario (requerido)</span>
              </div>
              <div className="flex gap-2">
                <code className="px-2 py-1 bg-muted rounded text-xs">redirect</code>
                <span className="text-muted-foreground">Ruta a la que redirigir después del login (default: /)</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">¿Cómo funciona?</label>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">1</span>
                <p>El usuario accede a la URL con su número de documento</p>
              </div>
              <div className="flex gap-2">
                <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">2</span>
                <p>El sistema busca al usuario por <code className="px-1 py-0.5 bg-muted rounded">numero_documento</code> en la BD</p>
              </div>
              <div className="flex gap-2">
                <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">3</span>
                <p>Inicia sesión automáticamente (contraseña = número de documento)</p>
              </div>
              <div className="flex gap-2">
                <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">4</span>
                <p>Redirige al chat donde ya están precreados los grupos</p>
              </div>
            </div>
          </div>

          {/* Ejemplos por rol */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Ejemplos por Rol</label>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`<!-- Estudiante: accede al chat de su grupo -->
<a href="https://sedefy.com/auto-login?documento=1012345678&redirect=/chat">
  Ir al Chat
</a>

<!-- Docente: accede al chat -->
<a href="https://sedefy.com/auto-login?documento=1009876543&redirect=/chat">
  Abrir Chat Escolar
</a>

<!-- Admin: accede al dashboard institucional -->
<a href="https://sedefy.com/auto-login?documento=1001234567&redirect=/institution">
  Panel Institución
</a>

<!-- Padre: accede al chat del grupo de su hijo -->
<a href="https://sedefy.com/auto-login?documento=1050001234&redirect=/chat">
  Chat con Docentes
</a>`}
            </pre>
          </div>

          {/* Ejemplo de integración con sistema escolar */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Integración desde Sistema Escolar (JavaScript)</label>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`// Generar botón de acceso al chat para cada usuario
function generarEnlaceChat(documento) {
  return \`https://sedefy.com/auto-login?documento=\${documento}&redirect=/chat\`;
}

// En la vista del estudiante
const btnChat = document.createElement('a');
btnChat.href = generarEnlaceChat(estudiante.documento);
btnChat.target = '_blank';
btnChat.textContent = 'Abrir Chat Escolar';
document.body.appendChild(btnChat);`}
            </pre>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Integración desde PHP</label>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`<?php
// En la vista del usuario en SEDE Académico
function enlaceChat($documento, $ruta = '/chat') {
    return "https://sedefy.com/auto-login?documento={$documento}&redirect={$ruta}";
}
?>

<!-- En la plantilla Blade/HTML -->
<a href="<?= enlaceChat($usuario->documento) ?>" target="_blank" class="btn btn-primary">
    💬 Abrir Chat Escolar
</a>`}
            </pre>
          </div>

          {/* Flujo completo */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              🔄 Flujo Completo de Integración
            </h4>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>Sincronice la institución con <code className="px-1 py-0.5 bg-blue-200/50 rounded">sync-institution-batch</code> (crea usuarios, grupos y chats)</li>
              <li>Genere enlaces de acceso con <code className="px-1 py-0.5 bg-blue-200/50 rounded">/auto-login?documento=XXX&redirect=/chat</code></li>
              <li>Los usuarios hacen clic → inician sesión automáticamente → entran al chat con sus grupos ya creados</li>
              <li>Re-sincronice periódicamente para actualizar usuarios nuevos o cambios de grupo</li>
            </ol>
          </div>

          {/* Seguridad */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
              🔒 Consideraciones de Seguridad
            </h4>
            <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
              <li>La contraseña de todos los usuarios es su número de documento</li>
              <li>Se recomienda que los usuarios cambien su contraseña después del primer acceso</li>
              <li>Los enlaces de auto-login deben generarse desde el servidor, nunca expuestos públicamente</li>
              <li>El endpoint <code className="px-1 py-0.5 bg-amber-200/50 rounded">sync-institution-batch</code> usa Service Role Key — no requiere autenticación de usuario</li>
              <li>Máximo 5000 usuarios por request para evitar timeouts</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Webhook de Consolidado de Notas */}
      <WebhookDocumentation />
    </div>
  );
}
