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

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const endpoint = `https://${projectId}.supabase.co/functions/v1/sedetok-search`;

  const exampleRequest = `curl -X GET "${endpoint}?q=matematicas&grado=7&limit=10" \\
  -H "x-api-key: YOUR_API_KEY"`;

  const exampleResponse = `{
  "data": [
    {
      "id": "uuid-here",
      "name": "Álgebra Básica",
      "description": "Introducción al álgebra para estudiantes de grado 7",
      "coverImage": "https://...",
      "url": "https://...lovableproject.com/learning-paths/uuid-here",
      "level": "basico"
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

  const copyToClipboard = (text: string, type: 'endpoint' | 'example') => {
    navigator.clipboard.writeText(text);
    if (type === 'endpoint') {
      setCopiedEndpoint(true);
      setTimeout(() => setCopiedEndpoint(false), 2000);
    } else {
      setCopiedExample(true);
      setTimeout(() => setCopiedExample(false), 2000);
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
                {endpoint}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(endpoint, 'endpoint')}
              >
                {copiedEndpoint ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
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
                onClick={() => copyToClipboard(exampleRequest, 'example')}
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
              {exampleRequest}
            </pre>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Response JSON</label>
            <pre className="p-4 bg-muted rounded text-xs font-mono overflow-x-auto">
              {exampleResponse}
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
          <CardTitle>Seguridad</CardTitle>
          <CardDescription>Consideraciones de seguridad y buenas prácticas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
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
            <p>Endpoint de solo lectura - no permite modificaciones</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
