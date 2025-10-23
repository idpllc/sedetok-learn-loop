import { useState } from "react";
import { Plus, Search, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePathContent } from "@/hooks/useLearningPaths";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface PathBuilderProps {
  data: any;
  onChange: (data: any) => void;
  pathId: string | null;
}

export const PathBuilder = ({ data, pathId }: PathBuilderProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const { contents, addContent, removeContent, reorderContents, updateContent } = usePathContent(pathId || undefined);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Fetch user's own content
  const { data: myContent, isLoading: loadingMyContent } = useQuery({
    queryKey: ["my-content", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data: contentData, error: contentError } = await supabase
        .from("content")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (contentError) throw contentError;

      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (quizError) throw quizError;

      const quizzes = (quizData || []).map(quiz => ({
        ...quiz,
        content_type: 'quiz' as const,
      }));

      return [...(contentData || []), ...quizzes].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!user?.id,
  });

  // Fetch public content (excluding user's own)
  const { data: publicContent, isLoading: loadingPublicContent } = useQuery({
    queryKey: ["public-content", user?.id],
    queryFn: async () => {
      const { data: contentData, error: contentError } = await supabase
        .from("content")
        .select("*")
        .eq("is_public", true)
        .neq("creator_id", user?.id || "")
        .order("created_at", { ascending: false })
        .limit(50);

      if (contentError) throw contentError;

      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("is_public", true)
        .eq("status", "publicado")
        .neq("creator_id", user?.id || "")
        .order("created_at", { ascending: false })
        .limit(50);

      if (quizError) throw quizError;

      const quizzes = (quizData || []).map(quiz => ({
        ...quiz,
        content_type: 'quiz' as const,
      }));

      return [...(contentData || []), ...quizzes]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50);
    },
  });

  const handleAddContent = async (contentId: string) => {
    if (!pathId) {
      toast({
        title: "Error",
        description: "Debes completar el paso 1 primero",
        variant: "destructive",
      });
      return;
    }

    // Verificar si el item es un quiz o content regular
    const item = [...(myContent || []), ...(publicContent || [])].find(i => i.id === contentId);
    if (!item) {
      toast({
        title: "Error",
        description: "No se encontró la cápsula",
        variant: "destructive",
      });
      return;
    }

    const isQuiz = item.content_type === 'quiz';
    
    try {
      const maxOrder = contents?.reduce((max, item) => 
        Math.max(max, item.order_index), -1) ?? -1;

      const insertData: any = {
        path_id: pathId,
        order_index: maxOrder + 1,
        is_required: false,
      };

      // Usar content_id o quiz_id según el tipo
      if (isQuiz) {
        insertData.quiz_id = contentId;
      } else {
        insertData.content_id = contentId;
      }

      await addContent.mutateAsync(insertData);

      toast({
        title: "Cápsula agregada",
        description: "La cápsula se agregó exitosamente a la ruta",
      });
    } catch (error: any) {
      console.error("Error adding content:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar la cápsula",
        variant: "destructive",
      });
    }
  };

  const handleRemoveContent = async (id: string) => {
    await removeContent.mutateAsync(id);
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (!contents || fromIndex === toIndex) return;

    const reordered = [...contents];
    const [movedItem] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedItem);

    const updates = reordered.map((item, index) => ({
      id: item.id,
      order_index: index,
    }));

    try {
      await reorderContents.mutateAsync(updates);
      toast({
        title: "Orden actualizado",
        description: "El orden de las cápsulas se ha actualizado",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el orden",
        variant: "destructive",
      });
    }
};

  const handleUpdateItem = async (id: string, updates: any) => {
    try {
      await updateContent.mutateAsync({ id, updates });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo actualizar la cápsula", variant: "destructive" });
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number, isFromLibrary: boolean) => {
    if (isFromLibrary) {
      const item = [...(myContent || []), ...(publicContent || [])][index];
      e.dataTransfer.setData('text/path-content-id', item?.id || '');
      e.dataTransfer.effectAllowed = 'copy';
    } else {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/reorder', 'true');
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const isReorder = e.dataTransfer.types.includes('text/reorder');
    if (isReorder && draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDropOnCard = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isReorder = e.dataTransfer.types.includes('text/reorder');
    
    if (isReorder && draggedIndex !== null) {
      await handleReorder(draggedIndex, dropIndex);
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  };

  const handleDrop = async (e: any) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const droppedId = e.dataTransfer.getData('text/path-content-id') || e.dataTransfer.getData('text/plain');
    if (!droppedId) return;
    if (!pathId) {
      toast({
        title: "Error",
        description: "Debes completar el paso 1 primero",
        variant: "destructive",
      });
      return;
    }
    if (contents?.some((c: any) => c.content_id === droppedId || c.quiz_id === droppedId)) {
      toast({
        title: "Ya agregado",
        description: "Esta cápsula ya está en la ruta",
      });
      return;
    }
    await handleAddContent(droppedId);
  };

  const filterContent = (items: any[] | undefined) => {
    if (!items) return [];
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const ContentLibrary = ({ items, loading }: { items: any[] | undefined; loading: boolean }) => {
    const filtered = filterContent(items);

    if (loading) {
      return (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-4xl mb-2">📚</div>
          <p>No se encontró contenido</p>
        </div>
      );
    }

    return (
      <div className="space-y-2 pb-4">
        {filtered.map((item) => {
          const thumbnail = item.thumbnail_url || 
            (item.content_type === 'video' && item.video_url ? 
              item.video_url.replace('upload/', 'upload/c_thumb,w_300/') : null) ||
            (item.content_type === 'documento' && item.cover_image) ||
            null;

          const isAdded = contents?.some((c: any) => 
            c.content_id === item.id || c.quiz_id === item.id
          );

          return (
            <Card
              key={item.id}
              className="p-3 hover:shadow-md transition-shadow overflow-visible"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/path-content-id', item.id);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              title="Arrastra para agregar al constructor"
            >
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  {thumbnail && (
                    <div className="w-20 h-14 rounded overflow-hidden flex-shrink-0 bg-muted">
                      <img
                        src={thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">
                        {item.content_type === 'video' ? '🎥' : 
                         item.content_type === 'lectura' ? '📖' :
                         item.content_type === 'documento' ? '📄' :
                         item.content_type === 'quiz' ? '📝' : '❓'}
                      </span>
                      <h4 className="font-medium text-sm truncate">{item.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="default" className="text-xs">
                        {item.content_type === 'video' ? 'Video' : 
                         item.content_type === 'lectura' ? 'Lectura' :
                         item.content_type === 'documento' ? 'Documento' :
                         item.content_type === 'quiz' ? 'Quiz' : 'Contenido'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {item.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {item.grade_level}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={isAdded ? "secondary" : "default"}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleAddContent(item.id); }}
                  disabled={addContent.isPending || isAdded}
                  className="w-auto px-6"
                  draggable={false}
                >
                  {isAdded ? "Agregado" : "Agregar"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Panel izquierdo - Biblioteca */}
      <div className="lg:col-span-1 space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-3">📚 Biblioteca de Cápsulas</h3>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cápsulas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="my" className="flex-1">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="my">Mías</TabsTrigger>
            <TabsTrigger value="public">Públicas</TabsTrigger>
            <TabsTrigger value="new">Nueva</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[600px]">
            <TabsContent value="my" className="mt-0">
              <ContentLibrary items={myContent} loading={loadingMyContent} />
            </TabsContent>

            <TabsContent value="public" className="mt-0">
              <ContentLibrary items={publicContent} loading={loadingPublicContent} />
            </TabsContent>

            <TabsContent value="new" className="mt-0">
              <div className="text-center py-8">
                <div className="text-4xl mb-4">✨</div>
                <p className="text-muted-foreground mb-4">
                  Crea una nueva cápsula
                </p>
                <Button onClick={() => window.open('/create', '_blank')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Cápsula
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      {/* Panel central - Constructor visual */}
      <div className="lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">🎨 Constructor Visual</h3>
          {pathId && (
            <Badge variant={contents && contents.length >= 3 ? "default" : "destructive"}>
              {contents?.length || 0} / 3 cápsulas mínimas
            </Badge>
          )}
        </div>
        
        {!pathId ? (
          <Card className="p-12 text-center">
            <div className="text-4xl mb-4">💡</div>
            <p className="text-muted-foreground">
              Completa el paso 1 para comenzar a construir tu ruta
            </p>
          </Card>
        ) : contents && contents.length > 0 ? (
          <div className="space-y-4">
            {contents.length < 3 && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm font-medium text-destructive">
                  ⚠️ Agrega al menos {3 - contents.length} cápsula(s) más para poder publicar la ruta
                </p>
              </div>
            )}
            <ScrollArea className="h-[600px]">
            <div
              className={`space-y-3 rounded-lg ${isDraggingOver ? "border-2 border-dashed border-primary/50 bg-primary/5" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleDrop}
            >
              {contents.map((item: any, index) => {
                // Determinar si es contenido regular o quiz
                const itemData = item.content || item.quiz;
                const isQuiz = !!item.quiz;
                
                const thumbnail = itemData?.thumbnail_url || 
                  (itemData?.content_type === 'video' && itemData?.video_url ? 
                    itemData.video_url.replace('upload/', 'upload/c_thumb,w_300/') : null) ||
                  (itemData?.content_type === 'documento' && itemData?.cover_image) ||
                  null;

                return (
                  <Card
                    key={item.id}
                    className={`p-4 transition-all ${
                      draggedIndex === index ? 'opacity-50' : ''
                    } ${
                      dragOverIndex === index ? 'border-2 border-primary' : ''
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index, false)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={(e) => handleDropOnCard(e, index)}
                    onDragEnd={() => {
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="cursor-move mt-1">
                        <GripVertical className="w-5 h-5 text-muted-foreground" />
                      </div>
                      {thumbnail && (
                        <div className="w-24 h-16 rounded overflow-hidden flex-shrink-0 bg-muted">
                          <img
                            src={thumbnail}
                            alt={itemData?.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">
                            {isQuiz ? '📝' :
                             itemData?.content_type === 'video' ? '🎥' : 
                             itemData?.content_type === 'lectura' ? '📖' :
                             itemData?.content_type === 'documento' ? '📄' : '❓'}
                          </span>
                          <div className="flex-1">
                            <h4 className="font-medium">{itemData?.title || 'Cápsula'}</h4>
                            <p className="text-sm text-muted-foreground">
                              Posición {index + 1}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Obligatoria</span>
                            <Switch
                              checked={!!item.is_required}
                              onCheckedChange={(checked) => handleUpdateItem(item.id, { is_required: checked })}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">⏱️</span>
                            <Input
                              type="number"
                              min={0}
                              className="h-8 w-24"
                              value={item.estimated_time_minutes ?? 0}
                              onChange={(e) => handleUpdateItem(item.id, { estimated_time_minutes: Math.max(0, parseInt(e.target.value || '0')) })}
                            />
                            <span className="text-xs text-muted-foreground ml-1">min</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">⚡</span>
                            <Input
                              type="number"
                              min={0}
                              className="h-8 w-24"
                              value={item.xp_reward ?? 0}
                              onChange={(e) => handleUpdateItem(item.id, { xp_reward: Math.max(0, parseInt(e.target.value || '0')) })}
                            />
                            <span className="text-xs text-muted-foreground ml-1">XP</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {itemData?.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveContent(item.id)}
                          disabled={removeContent.isPending}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-sm font-medium text-destructive">
                ⚠️ Debes agregar al menos 3 cápsulas para poder publicar la ruta
              </p>
            </div>
            <Card
              className={`p-12 text-center rounded-lg ${isDraggingOver ? "border-2 border-dashed border-primary/50 bg-primary/5" : "border-2 border-dashed"}`}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleDrop}
            >
              <div className="text-4xl mb-4">👈</div>
              <p className="text-muted-foreground mb-2">
                Agrega cápsulas desde la biblioteca o arrastra y suelta aquí
              </p>
              <p className="text-xs text-muted-foreground">
                Mínimo 3 cápsulas requeridas
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
