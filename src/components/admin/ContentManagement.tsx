import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Eye, EyeOff, Search, Video, FileText, BookOpen, HelpCircle, Route as RouteIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";

const PAGE_SIZE = 20;

export function ContentManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");

  const { data: allContent, isLoading: contentLoading } = useQuery({
    queryKey: ["admin-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content")
        .select("*, profiles:creator_id(username, full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allQuizzes, isLoading: quizzesLoading } = useQuery({
    queryKey: ["admin-quizzes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*, profiles:creator_id(username, full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allPaths, isLoading: pathsLoading } = useQuery({
    queryKey: ["admin-paths"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_paths")
        .select("*, profiles:creator_id(username, full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: "content" | "quiz" | "path" }) => {
      const table = type === "content" ? "content" : type === "quiz" ? "quizzes" : "learning_paths";
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      const key = variables.type === "content" ? "admin-content" : variables.type === "quiz" ? "admin-quizzes" : "admin-paths";
      queryClient.invalidateQueries({ queryKey: [key] });
      toast({ title: "Eliminado exitosamente", description: "El contenido ha sido eliminado" });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, type, isPublic }: { id: string; type: "content" | "quiz" | "path"; isPublic: boolean }) => {
      const table = type === "content" ? "content" : type === "quiz" ? "quizzes" : "learning_paths";
      const { error } = await supabase.from(table as any).update({ is_public: !isPublic }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      const key = variables.type === "content" ? "admin-content" : variables.type === "quiz" ? "admin-quizzes" : "admin-paths";
      queryClient.invalidateQueries({ queryKey: [key] });
      toast({ title: "Actualizado", description: "Visibilidad actualizada correctamente" });
    },
  });

  const filteredContent = allContent?.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (contentTypeFilter === "all" || item.content_type === contentTypeFilter)
  );
  const filteredQuizzes = allQuizzes?.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredPaths = allPaths?.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const contentPag = usePagination(filteredContent, PAGE_SIZE);
  const quizPag = usePagination(filteredQuizzes, PAGE_SIZE);
  const pathsPag = usePagination(filteredPaths, PAGE_SIZE);

  useEffect(() => {
    contentPag.setPage(1);
    quizPag.setPage(1);
    pathsPag.setPage(1);
  }, [searchTerm, contentTypeFilter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Contenido</CardTitle>
        <CardDescription>Administra todos los videos, documentos, lecturas, quizzes y rutas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar contenido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="content" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">
              <Video className="w-4 h-4 mr-2" />
              Contenido ({contentPag.totalItems})
            </TabsTrigger>
            <TabsTrigger value="quizzes">
              <HelpCircle className="w-4 h-4 mr-2" />
              Quizzes ({quizPag.totalItems})
            </TabsTrigger>
            <TabsTrigger value="paths">
              <RouteIcon className="w-4 h-4 mr-2" />
              Rutas ({pathsPag.totalItems})
            </TabsTrigger>
          </TabsList>

          {/* ── CONTENIDO ── */}
          <TabsContent value="content">
            <div className="mb-4">
              <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tipo de contenido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="document">Documentos</SelectItem>
                  <SelectItem value="reading">Lecturas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {contentLoading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Portada</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Creador</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contentPag.paged.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.thumbnail_url ? (
                              <img src={item.thumbnail_url} alt={item.title} className="w-16 h-16 object-cover rounded" />
                            ) : (
                              <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                                {item.content_type === 'video' && <Video className="w-6 h-6 text-muted-foreground" />}
                                {item.content_type === 'document' && <FileText className="w-6 h-6 text-muted-foreground" />}
                                {item.content_type === 'lectura' && <BookOpen className="w-6 h-6 text-muted-foreground" />}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell><Badge variant="outline">{item.content_type}</Badge></TableCell>
                          <TableCell>{(item.profiles as any)?.username || 'Desconocido'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.is_public ? "default" : "secondary"}>
                              {item.is_public ? "Público" : "Privado"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon"
                                onClick={() => toggleVisibilityMutation.mutate({ id: item.id, type: "content", isPublic: item.is_public ?? false })}>
                                {item.is_public ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </Button>
                              <Button variant="ghost" size="icon"
                                onClick={() => { if (confirm("¿Eliminar este contenido?")) deleteContentMutation.mutate({ id: item.id, type: "content" }); }}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <PaginationControls
                  page={contentPag.page} totalPages={contentPag.totalPages}
                  totalItems={contentPag.totalItems} pageSize={contentPag.pageSize}
                  onPageChange={contentPag.setPage}
                />
              </>
            )}
          </TabsContent>

          {/* ── QUIZZES ── */}
          <TabsContent value="quizzes">
            {quizzesLoading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Portada</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Dificultad</TableHead>
                        <TableHead>Creador</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quizPag.paged.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.thumbnail_url ? (
                              <img src={item.thumbnail_url} alt={item.title} className="w-16 h-16 object-cover rounded" />
                            ) : (
                              <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                                <HelpCircle className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell><Badge variant="outline">{item.difficulty}</Badge></TableCell>
                          <TableCell>{(item.profiles as any)?.username || 'Desconocido'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.is_public ? "default" : "secondary"}>
                              {item.is_public ? "Público" : "Privado"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon"
                                onClick={() => toggleVisibilityMutation.mutate({ id: item.id, type: "quiz", isPublic: item.is_public ?? false })}>
                                {item.is_public ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </Button>
                              <Button variant="ghost" size="icon"
                                onClick={() => { if (confirm("¿Eliminar este quiz?")) deleteContentMutation.mutate({ id: item.id, type: "quiz" }); }}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <PaginationControls
                  page={quizPag.page} totalPages={quizPag.totalPages}
                  totalItems={quizPag.totalItems} pageSize={quizPag.pageSize}
                  onPageChange={quizPag.setPage}
                />
              </>
            )}
          </TabsContent>

          {/* ── RUTAS ── */}
          <TabsContent value="paths">
            {pathsLoading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Portada</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Creador</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pathsPag.paged.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {(item.cover_url || item.thumbnail_url) ? (
                              <img src={item.cover_url || item.thumbnail_url || ""} alt={item.title} className="w-16 h-16 object-cover rounded" />
                            ) : (
                              <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                                <RouteIcon className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell><Badge variant="outline">{item.subject || item.category}</Badge></TableCell>
                          <TableCell>{(item.profiles as any)?.username || 'Desconocido'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.is_public ? "default" : "secondary"}>
                              {item.is_public ? "Público" : "Privado"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon"
                                onClick={() => toggleVisibilityMutation.mutate({ id: item.id, type: "path", isPublic: item.is_public ?? false })}>
                                {item.is_public ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </Button>
                              <Button variant="ghost" size="icon"
                                onClick={() => { if (confirm("¿Eliminar esta ruta?")) deleteContentMutation.mutate({ id: item.id, type: "path" }); }}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <PaginationControls
                  page={pathsPag.page} totalPages={pathsPag.totalPages}
                  totalItems={pathsPag.totalItems} pageSize={pathsPag.pageSize}
                  onPageChange={pathsPag.setPage}
                />
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
