import { useState } from "react";
import { ArrowLeft, Copy, Check, ExternalLink, Search, Filter, BookOpen, Code, Zap, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-learning-paths`;

const CodeBlock = ({ code, language = "bash" }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden border border-border bg-muted/50">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/80">
        <span className="text-xs font-mono text-muted-foreground">{language}</span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 text-xs">
          {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const ParamRow = ({ name, type, required, description }: { name: string; type: string; required?: boolean; description: string }) => (
  <tr className="border-b border-border">
    <td className="py-3 px-4 font-mono text-sm text-primary">{name}</td>
    <td className="py-3 px-4">
      <Badge variant="outline" className="text-xs">{type}</Badge>
    </td>
    <td className="py-3 px-4">
      {required ? <Badge className="bg-red-500/10 text-red-500 text-xs">Requerido</Badge> : <span className="text-xs text-muted-foreground">Opcional</span>}
    </td>
    <td className="py-3 px-4 text-sm text-muted-foreground">{description}</td>
  </tr>
);

const ApiDocumentation = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Sedefy API — Rutas de Aprendizaje</h1>
            <p className="text-sm text-muted-foreground">API pública abierta para integración externa</p>
          </div>
          <Badge variant="outline" className="ml-auto">v1.0</Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Intro */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Search className="w-5 h-5 text-primary" /></div>
                <div>
                  <h3 className="font-semibold text-sm">Búsqueda avanzada</h3>
                  <p className="text-xs text-muted-foreground">Busca por título, tags, categoría, nivel, asignatura y más</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Filter className="w-5 h-5 text-primary" /></div>
                <div>
                  <h3 className="font-semibold text-sm">Filtros combinables</h3>
                  <p className="text-xs text-muted-foreground">Combina múltiples filtros en una sola petición</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-500/10"><Globe className="w-5 h-5 text-green-600" /></div>
                <div>
                  <h3 className="font-semibold text-sm">100% Abierta</h3>
                  <p className="text-xs text-muted-foreground">Sin API key, sin autenticación. Solo haz la petición GET</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Base URL */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Code className="w-5 h-5" /> URL Base</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <CodeBlock language="text" code={API_BASE_URL} />
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm"><strong>✅ API completamente abierta:</strong> No necesitas API key, tokens ni autenticación. Solo haz una petición <code className="bg-muted px-1 rounded">GET</code> a la URL.</p>
            </div>
          </CardContent>
        </Card>

        {/* Endpoint */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              <Badge className="bg-green-500/10 text-green-600 mr-2">GET</Badge>
              Listar Rutas de Aprendizaje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Devuelve una lista paginada de rutas de aprendizaje públicas y publicadas, con opción de incluir los ítems de contenido de cada ruta.
            </p>

            {/* Query Params */}
            <div>
              <h3 className="font-semibold mb-3">Parámetros de consulta (Query Params)</h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left">
                  <thead className="bg-muted/50">
                    <tr className="border-b border-border">
                      <th className="py-2 px-4 text-xs font-semibold">Parámetro</th>
                      <th className="py-2 px-4 text-xs font-semibold">Tipo</th>
                      <th className="py-2 px-4 text-xs font-semibold">Requerido</th>
                      <th className="py-2 px-4 text-xs font-semibold">Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ParamRow name="id" type="uuid" description="Obtener una ruta específica por su ID" />
                    <ParamRow name="search" type="string" description="Búsqueda por título, descripción o tema" />
                    <ParamRow name="tags" type="string" description="Filtrar por tags (separados por coma). Ej: 'historia,ciencias'" />
                    <ParamRow name="category" type="enum" description="Filtrar por categoría. Valores: matematicas, ciencias, lenguaje, historia, arte, tecnologia, idiomas, educacion_fisica, musica, religion, etica, emprendimiento, filosofia, economia" />
                    <ParamRow name="grade_level" type="enum" description="Filtrar por nivel. Valores: preescolar, primaria, secundaria, media, universidad, profesional" />
                    <ParamRow name="subject" type="string" description="Filtrar por asignatura exacta. Ej: 'Biología', 'Historia'" />
                    <ParamRow name="level" type="string" description="Filtrar por nivel de dificultad. Ej: 'basico', 'intermedio', 'avanzado'" />
                    <ParamRow name="language" type="string" description="Filtrar por idioma. Ej: 'Español', 'English'" />
                    <ParamRow name="tipo_aprendizaje" type="enum" description="Filtrar por tipo de aprendizaje. Valores: Visual, Auditivo, Lectura/Escritura, Kinestésico, Musical, Naturalista, Interpersonal, Intrapersonal, Lógico-Matemático, Existencial" />
                    <ParamRow name="topic" type="string" description="Búsqueda parcial por tema (ilike)" />
                    <ParamRow name="creator_id" type="uuid" description="Filtrar por ID del creador" />
                    <ParamRow name="include_content" type="boolean" description="Si es 'true', incluye los ítems de contenido (quizzes, juegos, lecturas) de cada ruta" />
                    <ParamRow name="page" type="integer" description="Página actual (default: 1)" />
                    <ParamRow name="limit" type="integer" description="Resultados por página (default: 20, máx: 100)" />
                    <ParamRow name="sort_by" type="string" description="Campo de ordenamiento: created_at, updated_at, title, total_xp, estimated_duration" />
                    <ParamRow name="sort_order" type="string" description="Orden: 'desc' (default) o 'asc'" />
                  </tbody>
                </table>
              </div>
            </div>

            {/* Response Schema */}
            <div>
              <h3 className="font-semibold mb-3">Esquema de respuesta</h3>
              <CodeBlock language="typescript" code={`{
  "data": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string | null",
      "objectives": "string | null",
      "category": "string",         // ej: "ciencias", "historia"
      "grade_level": "string",      // ej: "secundaria", "universidad"
      "subject": "string | null",   // ej: "Biología"
      "topic": "string | null",
      "level": "string | null",     // ej: "intermedio"
      "language": "string | null",  // ej: "Español"
      "tipo_aprendizaje": "string | null", // ej: "Visual"
      "tags": ["string"],
      "cover_url": "string | null",
      "thumbnail_url": "string | null",
      "total_xp": 0,
      "estimated_duration": 20,     // en minutos
      "enforce_order": true,
      "require_quiz_pass": true,
      "allow_collaboration": true,
      "status": "published",
      "created_at": "ISO 8601",
      "updated_at": "ISO 8601",
      "creator_id": "uuid",
      "profiles": {                 // Datos del creador
        "id": "uuid",
        "username": "string",
        "full_name": "string | null",
        "avatar_url": "string | null",
        "is_verified": false
      },
      // Solo si include_content=true:
      "content_items": [
        {
          "id": "uuid",
          "path_id": "uuid",
          "order_index": 0,
          "section_name": "string | null",
          "is_required": true,
          "estimated_time_minutes": 10,
          "xp_reward": 50,
          "content_id": "uuid | null",
          "quiz_id": "uuid | null",
          "game_id": "uuid | null",
          "content": { "id", "title", "description", "content_type", "thumbnail_url", "video_url" },
          "quizzes": { "id", "title", "description", "difficulty", "thumbnail_url" },
          "games": { "id", "title", "description", "game_type", "thumbnail_url" }
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}`} />
            </div>
          </CardContent>
        </Card>

        {/* Examples */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ExternalLink className="w-5 h-5" /> Ejemplos de uso</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="curl">
              <TabsList className="mb-4">
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="js">JavaScript / fetch</TabsTrigger>
                <TabsTrigger value="react">React (v0)</TabsTrigger>
              </TabsList>

              <TabsContent value="curl" className="space-y-4">
                <p className="text-sm font-medium">1. Listar todas las rutas</p>
                <CodeBlock language="bash" code={`curl "${API_BASE_URL}"`} />

                <p className="text-sm font-medium">2. Buscar por texto</p>
                <CodeBlock language="bash" code={`curl "${API_BASE_URL}?search=guerra&limit=5"`} />

                <p className="text-sm font-medium">3. Filtrar por tags + categoría</p>
                <CodeBlock language="bash" code={`curl "${API_BASE_URL}?tags=historia,medieval&category=historia"`} />

                <p className="text-sm font-medium">4. Obtener una ruta con su contenido</p>
                <CodeBlock language="bash" code={`curl "${API_BASE_URL}?id=UUID_AQUI&include_content=true"`} />

                <p className="text-sm font-medium">5. Filtrar por nivel + asignatura + paginación</p>
                <CodeBlock language="bash" code={`curl "${API_BASE_URL}?grade_level=secundaria&subject=Historia&page=2&limit=10&sort_by=title&sort_order=asc"`} />
              </TabsContent>

              <TabsContent value="js" className="space-y-4">
                <p className="text-sm font-medium">Función de búsqueda con filtros</p>
                <CodeBlock language="javascript" code={`const API_URL = "${API_BASE_URL}";

async function searchLearningPaths(filters = {}) {
  const params = new URLSearchParams();
  
  // Agregar filtros
  if (filters.search) params.set("search", filters.search);
  if (filters.tags) params.set("tags", filters.tags.join(","));
  if (filters.category) params.set("category", filters.category);
  if (filters.grade_level) params.set("grade_level", filters.grade_level);
  if (filters.subject) params.set("subject", filters.subject);
  if (filters.level) params.set("level", filters.level);
  if (filters.tipo_aprendizaje) params.set("tipo_aprendizaje", filters.tipo_aprendizaje);
  if (filters.include_content) params.set("include_content", "true");
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  if (filters.sort_order) params.set("sort_order", filters.sort_order);

  const response = await fetch(\`\${API_URL}?\${params}\`);
  
  if (!response.ok) throw new Error("Error fetching learning paths");
  return response.json();
}

// Ejemplos de uso:
const results = await searchLearningPaths({
  search: "guerra",
  category: "historia",
  grade_level: "secundaria",
  limit: 10
});

console.log(results.data);        // Array de rutas
console.log(results.pagination);  // Info de paginación`} />
              </TabsContent>

              <TabsContent value="react" className="space-y-4">
                <p className="text-sm font-medium">Componente React listo para usar en v0</p>
                <CodeBlock language="tsx" code={`"use client";
import { useState, useEffect } from "react";

const API_URL = "${API_BASE_URL}";

interface LearningPath {
  id: string;
  title: string;
  description: string | null;
  category: string;
  grade_level: string;
  subject: string | null;
  tags: string[];
  cover_url: string | null;
  estimated_duration: number;
  total_xp: number;
  profiles: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

interface ApiResponse {
  data: LearningPath[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export default function LearningPathSearch() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [pagination, setPagination] = useState<ApiResponse["pagination"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const fetchPaths = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "12" });
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (gradeLevel) params.set("grade_level", gradeLevel);

    try {
      const res = await fetch(\`\${API_URL}?\${params}\`);
      const json: ApiResponse = await res.json();
      setPaths(json.data);
      setPagination(json.pagination);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPaths(); }, [page, category, gradeLevel]);

  const categories = [
    { value: "", label: "Todas" },
    { value: "matematicas", label: "Matemáticas" },
    { value: "ciencias", label: "Ciencias" },
    { value: "lenguaje", label: "Lenguaje" },
    { value: "historia", label: "Historia" },
    { value: "arte", label: "Arte" },
    { value: "tecnologia", label: "Tecnología" },
    { value: "idiomas", label: "Idiomas" },
  ];

  const gradeLevels = [
    { value: "", label: "Todos" },
    { value: "preescolar", label: "Preescolar" },
    { value: "primaria", label: "Primaria" },
    { value: "secundaria", label: "Secundaria" },
    { value: "media", label: "Media" },
    { value: "universidad", label: "Universidad" },
    { value: "profesional", label: "Profesional" },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Explorar Rutas de Aprendizaje</h1>
      
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchPaths()}
          placeholder="Buscar rutas..."
          className="border rounded-lg px-4 py-2 flex-1 min-w-[200px]"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="border rounded-lg px-3 py-2">
          {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="border rounded-lg px-3 py-2">
          {gradeLevels.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <button onClick={fetchPaths} className="bg-blue-600 text-white px-6 py-2 rounded-lg">
          Buscar
        </button>
      </div>

      {/* Resultados */}
      {loading ? (
        <p className="text-center py-12 text-gray-500">Cargando...</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paths.map((path) => (
            <div key={path.id} className="border rounded-xl overflow-hidden hover:shadow-lg transition">
              {path.cover_url && (
                <img src={path.cover_url} alt={path.title} className="w-full h-40 object-cover" />
              )}
              <div className="p-4">
                <h3 className="font-semibold line-clamp-2">{path.title}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{path.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {path.tags?.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                  <span>Por {path.profiles?.full_name || path.profiles?.username}</span>
                  <span>{path.estimated_duration} min · {path.total_xp} XP</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button disabled={!pagination.has_prev} onClick={() => setPage(page - 1)}
            className="px-4 py-2 border rounded-lg disabled:opacity-50">Anterior</button>
          <span className="px-4 py-2">Página {pagination.page} de {pagination.total_pages}</span>
          <button disabled={!pagination.has_next} onClick={() => setPage(page + 1)}
            className="px-4 py-2 border rounded-lg disabled:opacity-50">Siguiente</button>
        </div>
      )}
    </div>
  );
}`} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Category values reference */}
        <Card>
          <CardHeader><CardTitle className="text-lg">📋 Valores válidos para filtros enum</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">category</h4>
              <div className="flex flex-wrap gap-1">
                {["matematicas","ciencias","lenguaje","historia","arte","tecnologia","idiomas","educacion_fisica","musica","religion","etica","emprendimiento","filosofia","economia"].map(v => (
                  <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">grade_level</h4>
              <div className="flex flex-wrap gap-1">
                {["preescolar","primaria","secundaria","media","universidad","profesional"].map(v => (
                  <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">tipo_aprendizaje</h4>
              <div className="flex flex-wrap gap-1">
                {["Visual","Auditivo","Lectura/Escritura","Kinestésico","Musical","Naturalista","Interpersonal","Intrapersonal","Lógico-Matemático","Existencial"].map(v => (
                  <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">sort_by</h4>
              <div className="flex flex-wrap gap-1">
                {["created_at","updated_at","title","total_xp","estimated_duration"].map(v => (
                  <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endpoint: Eventos por documento */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-blue-500/10 text-blue-600">GET</Badge>
              <CardTitle className="text-lg font-mono">/public-events-by-document</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Devuelve los eventos evaluativos (quizzes, juegos y rutas) asignados o accesibles para un usuario,
              identificado por su número de documento. Útil para integraciones que necesitan listar las actividades
              evaluativas de un estudiante.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">URL</h4>
              <CodeBlock language="url" code={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-events-by-document`} />
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Parámetros (query string)</h4>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left">
                  <thead className="bg-muted/50">
                    <tr className="border-b border-border">
                      <th className="py-2 px-4 text-xs font-semibold">Nombre</th>
                      <th className="py-2 px-4 text-xs font-semibold">Tipo</th>
                      <th className="py-2 px-4 text-xs font-semibold">Requerido</th>
                      <th className="py-2 px-4 text-xs font-semibold">Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ParamRow name="documento" type="string" required description="Número de documento del usuario" />
                    <ParamRow name="estado" type="enum" description="Filtra por estado: activa | finalizada | programada" />
                    <ParamRow name="limit" type="number" description="Máximo de eventos a devolver (1–100, default 50)" />
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Ejemplo de petición</h4>
              <CodeBlock code={`curl "${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-events-by-document?documento=1234567890&estado=activa&limit=20"`} />
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Ejemplo de respuesta</h4>
              <CodeBlock language="json" code={`{
  "user": {
    "id": "uuid",
    "username": "string",
    "full_name": "string",
    "numero_documento": "1234567890",
    "institution": "string"
  },
  "total": 3,
  "events": [
    {
      "id": "uuid",
      "title": "Evaluación de Matemáticas",
      "description": "string",
      "access_code": "ABC12345",
      "start_date": "2026-04-25T08:00:00Z",
      "end_date": "2026-04-30T23:59:00Z",
      "status": "activa",
      "type": "quiz",
      "quiz_id": "uuid",
      "game_id": null,
      "path_id": null,
      "url": "https://sedefy.com/quiz-evaluation/ABC12345"
    }
  ]
}`} />
            </div>
          </CardContent>
        </Card>

        {/* Endpoint: Resultados de evento por documento */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-blue-500/10 text-blue-600">GET</Badge>
              <CardTitle className="text-lg font-mono">/public-event-results-by-document</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Devuelve los resultados (intentos y respuestas) de un usuario en una actividad evaluativa específica,
              identificada por <code className="font-mono text-xs">access_code</code> o <code className="font-mono text-xs">event_id</code>.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">URL</h4>
              <CodeBlock language="url" code={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-event-results-by-document`} />
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Parámetros (query string)</h4>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left">
                  <thead className="bg-muted/50">
                    <tr className="border-b border-border">
                      <th className="py-2 px-4 text-xs font-semibold">Nombre</th>
                      <th className="py-2 px-4 text-xs font-semibold">Tipo</th>
                      <th className="py-2 px-4 text-xs font-semibold">Requerido</th>
                      <th className="py-2 px-4 text-xs font-semibold">Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ParamRow name="documento" type="string" required description="Número de documento del usuario" />
                    <ParamRow name="access_code" type="string" description="Código de acceso del evento (alternativa a event_id)" />
                    <ParamRow name="event_id" type="uuid" description="ID del evento evaluativo (alternativa a access_code)" />
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ⚠️ Debes enviar al menos uno: <code>access_code</code> o <code>event_id</code>.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Ejemplo de petición</h4>
              <CodeBlock code={`curl "${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-event-results-by-document?documento=1234567890&access_code=ABC12345"`} />
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Ejemplo de respuesta</h4>
              <CodeBlock language="json" code={`{
  "user": {
    "id": "uuid",
    "full_name": "string",
    "numero_documento": "1234567890"
  },
  "event": {
    "id": "uuid",
    "title": "Evaluación de Matemáticas",
    "access_code": "ABC12345",
    "type": "quiz"
  },
  "total_attempts": 1,
  "attempts": [
    {
      "id": "uuid",
      "started_at": "2026-04-25T08:15:00Z",
      "completed_at": "2026-04-25T08:42:00Z",
      "score": 85,
      "max_score": 100,
      "passed": true,
      "responses": [
        {
          "question_id": "uuid",
          "question_text": "string",
          "selected_answer": "string",
          "correct_answer": "string",
          "is_correct": true,
          "points_earned": 10
        }
      ]
    }
  ]
}`} />
            </div>
          </CardContent>
        </Card>

        {/* Errors */}

        <Card>
          <CardHeader><CardTitle className="text-lg">⚠️ Códigos de error</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th className="py-2 px-4 text-xs font-semibold">Código</th>
                    <th className="py-2 px-4 text-xs font-semibold">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-2 px-4"><Badge className="bg-green-500/10 text-green-600 text-xs">200</Badge></td>
                    <td className="py-2 px-4 text-sm text-muted-foreground">OK — Resultados devueltos correctamente</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-4"><Badge className="bg-amber-500/10 text-amber-600 text-xs">405</Badge></td>
                    <td className="py-2 px-4 text-sm text-muted-foreground">Método no permitido — Solo se acepta GET</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-4"><Badge className="bg-red-500/10 text-red-600 text-xs">500</Badge></td>
                    <td className="py-2 px-4 text-sm text-muted-foreground">Error interno del servidor</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong>ℹ️ Información:</strong> Máximo 100 resultados por página. Solo se devuelven rutas públicas y con estado "published". 
              La API es completamente abierta y no requiere ningún tipo de autenticación ni API key.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApiDocumentation;
