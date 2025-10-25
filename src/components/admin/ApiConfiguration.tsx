import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code, Copy, Check, ExternalLink, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
                <code className="px-2 py-1 bg-muted rounded text-xs">username</code>
                <span className="text-muted-foreground">Nombre de usuario (opcional)</span>
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
            API - Resultados Académicos
          </CardTitle>
          <CardDescription>
            Endpoint para enviar resultados de asignaturas desde Sedefy Académico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <code className="block px-3 py-2 bg-muted rounded text-sm">
            POST https://{projectId}.supabase.co/functions/v1/submit-subject-results
          </code>
          
          <p className="text-sm text-muted-foreground">
            Envía resultados académicos que se integran automáticamente al perfil del estudiante.
            Máximo 5000 resultados por solicitud. Requiere: institution_id, results[numero_documento, 
            area_academica, asignatura_nombre, periodo_academico, score, max_score].
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
