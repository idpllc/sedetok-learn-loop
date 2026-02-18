import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Copy, Check, ExternalLink, Key, Link, Users, BookOpen, BarChart3, Webhook } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WebhookDocumentation } from "./WebhookDocumentation";

function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copiado", description: "Contenido copiado al portapapeles" });
  };
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy}>
      {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
      {label}
    </Button>
  );
}

function EndpointBadge({ url, method = "GET" }: { url: string; method?: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge>{method}</Badge>
          <Badge variant="outline" className="gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Activo
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">{url}</code>
        <Button variant="outline" size="icon" onClick={() => {
          navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          toast({ title: "URL copiada" });
        }}>
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

function CodeBlock({ code, language = "" }: { code: string; language?: string }) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted/60 rounded-t border-b border-border">
        <span className="text-xs text-muted-foreground font-mono">{language}</span>
        <CopyButton text={code} label="Copiar" />
      </div>
      <pre className="p-4 bg-muted rounded-b text-xs font-mono overflow-x-auto">{code}</pre>
    </div>
  );
}

export function ApiConfiguration() {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const pathsEndpoint = `https://${projectId}.supabase.co/functions/v1/sedetok-search`;
  const contentEndpoint = `https://${projectId}.supabase.co/functions/v1/sedetok-content-search`;
  const autoLoginEndpoint = `https://${projectId}.supabase.co/functions/v1/auto-login`;
  const createUserEndpoint = `https://${projectId}.supabase.co/functions/v1/create-user-by-document`;
  const bulkEndpoint = `https://${projectId}.supabase.co/functions/v1/create-users-bulk`;
  const subjectResultsEndpoint = `https://${projectId}.supabase.co/functions/v1/submit-subject-results`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Documentación de APIs</h2>
        <p className="text-sm text-muted-foreground">Endpoints disponibles para integración con sistemas externos</p>
      </div>

      <Tabs defaultValue="autologin" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="autologin" className="flex items-center gap-1.5 text-xs">
            <Link className="w-3.5 h-3.5" />
            Auto-login
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-1.5 text-xs">
            <BookOpen className="w-3.5 h-3.5" />
            Búsqueda
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" />
            Resultados
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-1.5 text-xs">
            <Webhook className="w-3.5 h-3.5" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        {/* ─────────────── AUTO-LOGIN ─────────────── */}
        <TabsContent value="autologin" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Auto-login — Registro y Login Automático
                  </CardTitle>
                  <CardDescription>
                    Crea el usuario si no existe, lo asigna a su institución, sede y grupo, y retorna la sesión activa.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-500/60">GET / POST</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <EndpointBadge url={autoLoginEndpoint} method="GET / POST" />

              {/* Cómo funciona */}
              <div className="space-y-2">
                <label className="text-sm font-medium">¿Qué hace el endpoint?</label>
                <div className="text-sm text-muted-foreground space-y-1.5 p-4 bg-muted/40 rounded-lg border">
                  <p><strong>1.</strong> Si el usuario <strong>no existe</strong>: lo crea con <code className="px-1 py-0.5 bg-muted rounded">documento</code> como contraseña.</p>
                  <p><strong>2.</strong> Vincula al usuario a la institución y la sede (las crea si no existen).</p>
                  <p><strong>3.</strong> Crea grupos de chat según el rol:</p>
                  <div className="pl-4 space-y-1 border-l-2 border-primary/30 mt-1">
                    <p>• <strong>Estudiante:</strong> Entra al grupo <code className="px-1 py-0.5 bg-muted rounded">{"{grupo} - {course_name}"}</code></p>
                    <p>• <strong>Docente:</strong> Entra al grupo <code className="px-1 py-0.5 bg-muted rounded">Docentes {"{sede}"}</code> (puede pertenecer a varias sedes)</p>
                    <p>• <strong>Admin:</strong> Entra al grupo <code className="px-1 py-0.5 bg-muted rounded">Admin</code> + todos los <code className="px-1 py-0.5 bg-muted rounded">Docentes {"{sede}"}</code></p>
                    <p>• <strong>Coordinador:</strong> Entra al grupo <code className="px-1 py-0.5 bg-muted rounded">Coordinadores</code> + todos los <code className="px-1 py-0.5 bg-muted rounded">Docentes {"{sede}"}</code></p>
                  </div>
                  <p className="mt-1"><strong>4.</strong> Si el usuario <strong>ya existe</strong>: inicia sesión sin duplicar grupos.</p>
                  <p><strong>5.</strong> Retorna sesión activa con <code className="px-1 py-0.5 bg-muted rounded">access_token</code> y <code className="px-1 py-0.5 bg-muted rounded">refresh_token</code>.</p>
                </div>
              </div>

              {/* Parámetros */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Parámetros (Query String o JSON Body)</label>
                <div className="divide-y border rounded-lg overflow-hidden">
                  {[
                    ["documento", "requerido", "Número de documento del usuario"],
                    ["institution", "requerido", "Nombre exacto de la institución"],
                    ["member_role", "requerido", "student | teacher | admin | coordinator | parent"],
                    ["full_name", "opcional", "Nombre completo (solo al crear usuario nuevo)"],
                    ["email", "opcional", "Email real; si no se proporciona: {documento}@sedefy.local"],
                    ["tipo_documento", "opcional", "CC, TI, CE, RC, PA — default: CC"],
                    ["grupo", "opcional", "Nombre del grupo (ej: 5°A)"],
                    ["course_name", "opcional", "Nombre del curso académico (ej: Quinto)"],
                    ["sede", "opcional", "Nombre de la sede (ej: Sede Norte)"],
                    ["academic_year", "opcional", "Año académico (ej: 2025)"],
                    ["es_director_grupo", "opcional", "true | false — si el docente es director de grupo"],
                    ["redirect", "opcional", "Ruta de destino después del login (ej: /chat)"],
                  ].map(([param, req, desc]) => (
                    <div key={param} className="flex gap-3 items-start px-3 py-2 text-sm bg-background">
                      <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0 font-mono">{param}</code>
                      <Badge variant={req === "requerido" ? "default" : "outline"} className="text-xs shrink-0">{req}</Badge>
                      <span className="text-muted-foreground text-xs">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ejemplos por rol */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Ejemplos de URL por Rol</label>
                <CodeBlock language="URL — Estudiante" code={`https://sedefy.com/auto-login?documento=1012345678&institution=Colegio San José&member_role=student&full_name=María López&grupo=5°A&course_name=Quinto&sede=Sede Norte&redirect=/chat`} />
                <CodeBlock language="URL — Docente (director de grupo)" code={`https://sedefy.com/auto-login?documento=1009876543&institution=Colegio San José&member_role=teacher&full_name=Carlos Pérez&sede=Sede Norte&grupo=6°B&course_name=Sexto&es_director_grupo=true&redirect=/chat`} />
                <CodeBlock language="URL — Administrador" code={`https://sedefy.com/auto-login?documento=1001234567&institution=Colegio San José&member_role=admin&full_name=Ana Rodríguez&redirect=/institution`} />
                <CodeBlock language="URL — Coordinador" code={`https://sedefy.com/auto-login?documento=1007654321&institution=Colegio San José&member_role=coordinator&full_name=Luis Martínez&redirect=/chat`} />
              </div>

              {/* Ejemplo cURL */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Ejemplo cURL (POST JSON)</label>
                <CodeBlock language="bash" code={`curl -X POST "${autoLoginEndpoint}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "documento": "1012345678",
    "institution": "Colegio San José",
    "member_role": "student",
    "full_name": "María López",
    "grupo": "5°A",
    "course_name": "Quinto",
    "sede": "Sede Norte"
  }'`} />
              </div>

              {/* Integración JS */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Integración desde JavaScript</label>
                <CodeBlock language="javascript" code={`const SEDEFY_URL = "https://sedefy.com";

function generarEnlace(usuario) {
  const params = new URLSearchParams({
    documento:   usuario.documento,
    institution: "Colegio San José",
    member_role: usuario.rol,       // student | teacher | admin | coordinator
    full_name:   usuario.nombre,
    sede:        usuario.sede,
    grupo:       usuario.grupo ?? "",
    course_name: usuario.curso ?? "",
    redirect:    "/chat",
  });
  return \`\${SEDEFY_URL}/auto-login?\${params}\`;
}

// Uso
const link = generarEnlace({
  documento: "1012345678",
  rol: "student",
  nombre: "María López",
  sede: "Sede Norte",
  grupo: "5°A",
  curso: "Quinto",
});
window.open(link, "_blank");`} />
              </div>

              {/* PHP */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Integración desde PHP</label>
                <CodeBlock language="php" code={`<?php
function enlaceSedefy(array $usuario, string $destino = '/chat'): string {
  $base = "https://sedefy.com/auto-login";
  $params = http_build_query([
    'documento'   => $usuario['documento'],
    'institution' => 'Colegio San José',
    'member_role' => $usuario['rol'],  // student|teacher|admin|coordinator
    'full_name'   => $usuario['nombre'],
    'sede'        => $usuario['sede'] ?? '',
    'grupo'       => $usuario['grupo'] ?? '',
    'course_name' => $usuario['curso'] ?? '',
    'redirect'    => $destino,
  ]);
  return "{$base}?{$params}";
}
?>

<!-- En la plantilla HTML -->
<a href="<?= htmlspecialchars(enlaceSedefy($usuario)) ?>" target="_blank">
  💬 Abrir Chat Escolar
</a>`} />
              </div>

              {/* Respuesta */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Respuesta Exitosa</label>
                <CodeBlock language="json" code={`{
  "success": true,
  "is_new_user": true,
  "session": {
    "access_token": "eyJhbGci...",
    "refresh_token": "v1_eyJhbGc...",
    "expires_in": 3600,
    "token_type": "bearer"
  },
  "user": {
    "id": "uuid-aqui",
    "email": "1012345678@sedefy.local",
    "full_name": "María López",
    "numero_documento": "1012345678",
    "member_role": "student",
    "institution": "Colegio San José",
    "sede": "Sede Norte",
    "grupo": "5°A",
    "course_name": "Quinto"
  }
}`} />
              </div>

              <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <h4 className="font-medium mb-2">🔒 Seguridad</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>La contraseña por defecto es el número de documento</li>
                  <li>Usa HTTPS para todas las peticiones</li>
                  <li>El endpoint es idempotente: no duplica usuarios ni grupos</li>
                  <li>Recomendado: Solo exponer el enlace directamente al usuario final</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────── BÚSQUEDA ─────────────── */}
        <TabsContent value="search" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                API REST — Búsqueda de Rutas de Aprendizaje
              </CardTitle>
              <CardDescription>Endpoint de solo lectura para consumir rutas de aprendizaje desde SEDE Academy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EndpointBadge url={pathsEndpoint} method="GET" />
              <div className="space-y-2">
                <label className="text-sm font-medium">Autenticación</label>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Key className="w-4 h-4" />
                  <span>API Key en header <code className="px-1 py-0.5 bg-muted rounded">x-api-key</code></span>
                </div>
                <p className="text-xs text-muted-foreground pl-6">✓ Localhost/127.0.0.1: No requiere autenticación (desarrollo)</p>
                <p className="text-xs text-muted-foreground pl-6">💡 Configura el secret <code className="px-1 py-0.5 bg-muted rounded">CUSTOM_DOMAIN</code> para cambiar las URLs en los resultados.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Parámetros</label>
                <div className="divide-y border rounded-lg overflow-hidden">
                  {[
                    ["q", "requerido", "Palabras clave de búsqueda"],
                    ["grado", "opcional", "Grado académico"],
                    ["asignatura", "opcional", "Área académica"],
                    ["nivel", "opcional", "basico | intermedio | avanzado"],
                    ["limit", "opcional", "Resultados por página (default: 20, max: 50)"],
                    ["page", "opcional", "Número de página (default: 1)"],
                    ["sort", "opcional", "relevance_desc | created_desc | name_asc"],
                  ].map(([p, r, d]) => (
                    <div key={p} className="flex gap-3 items-start px-3 py-2 text-sm bg-background">
                      <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0 font-mono">{p}</code>
                      <Badge variant={r === "requerido" ? "default" : "outline"} className="text-xs shrink-0">{r}</Badge>
                      <span className="text-muted-foreground text-xs">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ejemplo</label>
                <CodeBlock language="bash" code={`curl -X GET "${pathsEndpoint}?q=matematicas&grado=7&limit=10" \\
  -H "x-api-key: YOUR_API_KEY"`} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Respuesta</label>
                <CodeBlock language="json" code={`{
  "data": [
    {
      "id": "uuid-here",
      "name": "Álgebra Básica",
      "description": "Introducción al álgebra para estudiantes de grado 7",
      "coverImage": "https://...",
      "url": "https://sedefy.com/learning-paths/uuid-here",
      "level": "basico",
      "tags": ["matemáticas", "álgebra", "números"]
    }
  ],
  "pagination": {
    "page": 1, "limit": 10, "total": 45,
    "totalPages": 5, "hasNext": true, "hasPrev": false
  }
}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                API REST — Búsqueda de Cápsulas Educativas
              </CardTitle>
              <CardDescription>Busca videos, documentos y lecturas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EndpointBadge url={contentEndpoint} method="GET" />
              <div className="space-y-2">
                <label className="text-sm font-medium">Parámetros adicionales</label>
                <div className="divide-y border rounded-lg overflow-hidden">
                  {[
                    ["q", "requerido", "Palabras clave"],
                    ["tipo", "opcional", "video | documento | lectura"],
                    ["grado", "opcional", "Grado académico"],
                    ["asignatura", "opcional", "Área académica"],
                    ["sort", "opcional", "relevance_desc | created_desc | views_desc | likes_desc | name_asc"],
                  ].map(([p, r, d]) => (
                    <div key={p} className="flex gap-3 items-start px-3 py-2 text-sm bg-background">
                      <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0 font-mono">{p}</code>
                      <Badge variant={r === "requerido" ? "default" : "outline"} className="text-xs shrink-0">{r}</Badge>
                      <span className="text-muted-foreground text-xs">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ejemplo</label>
                <CodeBlock language="bash" code={`curl -X GET "${contentEndpoint}?q=ecosistemas&grado=primaria&tipo=video" \\
  -H "x-api-key: YOUR_API_KEY"`} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Respuesta</label>
                <CodeBlock language="json" code={`{
  "data": [
    {
      "id": "uuid-here",
      "name": "Los Ecosistemas",
      "description": "Video educativo sobre los diferentes tipos de ecosistemas",
      "thumbnail": "https://...",
      "url": "https://sedefy.com/?contentId=uuid-here",
      "type": "video",
      "tags": ["ciencias", "ecosistemas"],
      "views": 1234,
      "likes": 89
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 23 }
}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seguridad y Límites</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                "Solo contenido con is_public=true es retornado",
                "Solo rutas con status='published' e is_public=true son retornadas",
                "El API Key debe mantenerse seguro y no compartirse públicamente",
                "Rate limiting automático: 60 req/min por API key",
                "Endpoints de solo lectura — no permiten modificaciones",
              ].map((item, i) => (
                <div key={i} className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0"></div>
                  <p>{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────── USUARIOS ─────────────── */}
        <TabsContent value="users" className="space-y-4 mt-4">
          {/* Individual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Crear Usuario Individual
              </CardTitle>
              <CardDescription>Registro individual desde sistemas externos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EndpointBadge url={createUserEndpoint} method="POST" />

              <div className="space-y-2">
                <label className="text-sm font-medium">Campos del Body</label>
                <div className="divide-y border rounded-lg overflow-hidden">
                  {[
                    ["tipo_documento", "requerido", "RC, NES, PPT, TI, CC, CE, TE, DIE, DESC"],
                    ["numero_documento", "requerido", "Número de documento"],
                    ["email", "opcional", "Si no se provee: {numero_documento}@sedefy.com"],
                    ["full_name", "opcional", "Nombre completo"],
                    ["username", "opcional", "Nombre de usuario"],
                    ["member_role", "opcional", "student | teacher | parent | admin (default: student)"],
                    ["nit_institucion", "opcional", "NIT de la institución educativa"],
                    ["nombre_sede", "opcional", "Nombre de la sede"],
                    ["grado", "opcional", "Grado del estudiante"],
                    ["grupo", "opcional", "Grupo del estudiante"],
                  ].map(([p, r, d]) => (
                    <div key={p} className="flex gap-3 items-start px-3 py-2 text-sm bg-background">
                      <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0 font-mono">{p}</code>
                      <Badge variant={r === "requerido" ? "default" : "outline"} className="text-xs shrink-0">{r}</Badge>
                      <span className="text-muted-foreground text-xs">{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ejemplo</label>
                <CodeBlock language="bash" code={`curl -X POST "${createUserEndpoint}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tipo_documento": "CC",
    "numero_documento": "1234567890",
    "email": "estudiante@example.com",
    "full_name": "Juan Pérez",
    "username": "jperez"
  }'`} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Respuesta Exitosa</label>
                <CodeBlock language="json" code={`{
  "success": true,
  "user": {
    "id": "uuid-generado",
    "email": "estudiante@example.com",
    "numero_documento": "1234567890",
    "tipo_documento": "CC",
    "message": "Usuario creado exitosamente. Contraseña: número de documento"
  }
}`} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Errores Comunes</label>
                <div className="space-y-2">
                  {[
                    ["400", "tipo_documento y numero_documento son requeridos"],
                    ["409", "Ya existe un usuario con ese número de documento"],
                  ].map(([code, msg]) => (
                    <div key={code} className="flex items-start gap-3 p-3 border rounded">
                      <Badge variant="destructive">{code}</Badge>
                      <code className="text-xs text-muted-foreground">{`{ "error": "${msg}" }`}</code>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Masiva */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Creación Masiva de Usuarios
              </CardTitle>
              <CardDescription>Hasta 3000 usuarios en una sola solicitud</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EndpointBadge url={bulkEndpoint} method="POST" />

              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-sm">
                <p className="font-medium mb-1">⚠️ Límites y Validaciones</p>
                <ul className="text-muted-foreground space-y-0.5 text-xs list-disc list-inside">
                  <li>Mínimo: 1 usuario — Máximo: 3000 usuarios por solicitud</li>
                  <li>No se crean usuarios duplicados (validación por número de documento)</li>
                  <li>Si un usuario falla, continúa con los demás</li>
                  <li>Email predeterminado: numero_documento@sedefy.com</li>
                  <li>Contraseña: número de documento</li>
                </ul>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Body</label>
                <CodeBlock language="json" code={`{
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
    }
  ]
}`} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ejemplo cURL</label>
                <CodeBlock language="bash" code={`curl -X POST "${bulkEndpoint}" \\
  -H "Content-Type: application/json" \\
  -d '{ "users": [ { "tipo_documento": "CC", "numero_documento": "1234567890", "full_name": "Juan Pérez" } ] }'`} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Respuesta Exitosa</label>
                <CodeBlock language="json" code={`{
  "success": true,
  "summary": { "total": 100, "success": 98, "errors": 2 },
  "results": [
    { "success": true, "user": { "id": "uuid", "email": "juan@example.com" }, "numero_documento": "1234567890" },
    { "success": false, "error": "Ya existe un usuario con ese número de documento", "numero_documento": "9999999999" }
  ]
}`} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────── RESULTADOS ACADÉMICOS ─────────────── */}
        <TabsContent value="results" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                API — Envío de Resultados Académicos
              </CardTitle>
              <CardDescription>
                Envía calificaciones y evaluaciones desde Sedefy Académico a Sedetok. Se integran al perfil académico del estudiante y alimentan el perfil vocacional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EndpointBadge url={subjectResultsEndpoint} method="POST" />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <p className="font-medium">Capacidad</p>
                  <p className="text-muted-foreground text-xs mt-1">Hasta 5000 resultados por solicitud</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <p className="font-medium">Timeout</p>
                  <p className="text-muted-foreground text-xs mt-1">300 segundos (5 minutos)</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Campos por Resultado</label>
                <div className="divide-y border rounded-lg overflow-hidden">
                  {[
                    ["numero_documento", "requerido", "Número de documento del estudiante"],
                    ["area_academica", "requerido", "Área académica (ver valores válidos)"],
                    ["asignatura_nombre", "requerido", "Nombre completo de la asignatura"],
                    ["periodo_academico", "requerido", "Periodo (ej: 2024-1, 2025-A)"],
                    ["score", "requerido", "Calificación obtenida"],
                    ["max_score", "requerido", "Calificación máxima posible"],
                    ["institution_id", "requerido", "UUID de la institución en Sedetok"],
                    ["asignatura_codigo", "opcional", "Código interno (ej: MAT101)"],
                    ["passed", "opcional", "Boolean — default: true si score ≥ 60%"],
                    ["docente_nombre", "opcional", "Nombre del docente"],
                    ["observaciones", "opcional", "Comentarios adicionales"],
                    ["completed_at", "opcional", "ISO 8601 — default: fecha actual"],
                  ].map(([p, r, d]) => (
                    <div key={p} className="flex gap-3 items-start px-3 py-2 text-sm bg-background">
                      <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0 font-mono">{p}</code>
                      <Badge variant={r === "requerido" ? "default" : "outline"} className="text-xs shrink-0">{r}</Badge>
                      <span className="text-muted-foreground text-xs">{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Áreas Académicas Válidas</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {["Matemáticas", "Ciencias Naturales", "Lengua Castellana", "Ciencias Sociales", "Lenguas Extranjeras", "Educación Física", "Educación Artística", "Tecnología e Informática", "Ética y Valores", "Religión"].map(area => (
                    <div key={area} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs border">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full shrink-0"></div>
                      <span>{area}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ejemplo cURL</label>
                <CodeBlock language="bash" code={`curl -X POST '${subjectResultsEndpoint}' \\
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
        "docente_nombre": "Prof. María García"
      }
    ]
  }'`} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ejemplo JavaScript</label>
                <CodeBlock language="javascript" code={`const response = await fetch('${subjectResultsEndpoint}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    institution_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    results: [
      {
        numero_documento: '1234567890',
        area_academica: 'Matemáticas',
        asignatura_nombre: 'Cálculo Diferencial',
        periodo_academico: '2024-1',
        score: 4.5,
        max_score: 5.0
      }
    ]
  })
});
const data = await response.json();
console.log(\`Procesados: \${data.processed}, Errores: \${data.errors}\`);`} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ejemplo Python</label>
                <CodeBlock language="python" code={`import requests

url = '${subjectResultsEndpoint}'
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
response = requests.post(url, json=payload)
data = response.json()
print(f"Procesados: {data['processed']}, Errores: {data['errors']}")`} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Respuesta Exitosa</label>
                <CodeBlock language="json" code={`{
  "success": true,
  "total": 100,
  "processed": 98,
  "errors": 2,
  "details": {
    "processed": [{ "numero_documento": "1234567890", "status": "success" }],
    "errors": [{ "numero_documento": "0000000000", "error": "Usuario no encontrado" }]
  }
}`} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Códigos de Error</label>
                <div className="space-y-2">
                  {[
                    ["400", "Content-Type inválido, body vacío, o campos faltantes"],
                    ["404", "Institución no encontrada"],
                    ["500", "Error interno del servidor"],
                  ].map(([code, msg]) => (
                    <div key={code} className="flex items-start gap-3 p-3 border rounded">
                      <Badge variant="destructive">{code}</Badge>
                      <span className="text-xs text-muted-foreground">{msg}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h4 className="font-medium mb-2">💡 Mejores Prácticas</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Envía máximo 1000 resultados por lote para mejor rendimiento</li>
                  <li>Verifica que los usuarios existan en Sedetok antes de enviar</li>
                  <li>Usa auto-login para crear usuarios antes de enviar sus resultados</li>
                  <li>Guarda el institution_id devuelto por el auto-login para usarlo aquí</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────── WEBHOOKS ─────────────── */}
        <TabsContent value="webhooks" className="mt-4">
          <WebhookDocumentation />
        </TabsContent>
      </Tabs>
    </div>
  );
}
