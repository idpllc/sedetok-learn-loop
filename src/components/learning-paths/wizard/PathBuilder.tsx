import { useState } from "react";
import { Plus, Search, GripVertical, X, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useContent } from "@/hooks/useContent";
import { usePathContent } from "@/hooks/useLearningPaths";
import { Skeleton } from "@/components/ui/skeleton";

interface PathBuilderProps {
  data: any;
  onChange: (data: any) => void;
  pathId: string | null;
}

export const PathBuilder = ({ data, pathId }: PathBuilderProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { content: myContent, isLoading: loadingMyContent } = useContent();
  const { content: publicContent, isLoading: loadingPublicContent } = useContent();
  const { contents, addContent, removeContent } = usePathContent(pathId || undefined);

  const handleAddContent = async (contentId: string) => {
    if (!pathId) return;
    
    const maxOrder = contents?.reduce((max, item) => 
      Math.max(max, item.order_index), -1) ?? -1;

    await addContent.mutateAsync({
      path_id: pathId,
      content_id: contentId,
      order_index: maxOrder + 1,
    } as any);
  };

  const handleRemoveContent = async (id: string) => {
    await removeContent.mutateAsync(id);
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
      <div className="space-y-2">
        {filtered.map((item) => (
          <Card key={item.id} className="p-3 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">
                    {item.content_type === 'video' ? '🎥' : 
                     item.content_type === 'lectura' ? '📖' :
                     item.content_type === 'documento' ? '📄' : '❓'}
                  </span>
                  <h4 className="font-medium text-sm truncate">{item.title}</h4>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {item.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {item.grade_level}
                  </Badge>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddContent(item.id)}
                disabled={!pathId}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </Card>
        ))}
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
                <Button onClick={() => window.open('/create-content', '_blank')}>
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
        <h3 className="font-semibold text-lg mb-3">🎨 Constructor Visual</h3>
        
        {!pathId ? (
          <Card className="p-12 text-center">
            <div className="text-4xl mb-4">💡</div>
            <p className="text-muted-foreground">
              Completa el paso 1 para comenzar a construir tu ruta
            </p>
          </Card>
        ) : contents && contents.length > 0 ? (
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {contents.map((item: any, index) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="cursor-move mt-1">
                      <GripVertical className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">
                          {item.content?.content_type === 'video' ? '🎥' : 
                           item.content?.content_type === 'lectura' ? '📖' :
                           item.content?.content_type === 'documento' ? '📄' : '❓'}
                        </span>
                        <div className="flex-1">
                          <h4 className="font-medium">{item.content?.title || 'Cápsula'}</h4>
                          <p className="text-sm text-muted-foreground">
                            Posición {index + 1}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.is_required && (
                          <Badge variant="secondary" className="text-xs">
                            Obligatoria
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {item.content?.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveContent(item.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <Card className="p-12 text-center">
            <div className="text-4xl mb-4">👈</div>
            <p className="text-muted-foreground">
              Agrega cápsulas desde la biblioteca para comenzar
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};
