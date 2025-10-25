import { useState } from "react";
import { Search, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useLearningPaths } from "@/hooks/useLearningPaths";
import { Skeleton } from "@/components/ui/skeleton";

interface RouteSearchModalProps {
  open: boolean;
  onClose: () => void;
  selectedRoutes: string[];
  onSelect: (routes: string[]) => void;
}

export const RouteSearchModal = ({
  open,
  onClose,
  selectedRoutes,
  onSelect,
}: RouteSearchModalProps) => {
  const { user } = useAuth();
  const { paths: myPaths, isLoading: loadingMyPaths } = useLearningPaths(user?.id, 'created');
  const { paths: publicPaths, isLoading: loadingPublicPaths } = useLearningPaths(undefined, 'all');
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<string[]>(selectedRoutes);

  const handleToggleRoute = (routeId: string) => {
    setSelected((prev) =>
      prev.includes(routeId)
        ? prev.filter((id) => id !== routeId)
        : [...prev, routeId]
    );
  };

  const handleConfirm = () => {
    onSelect(selected);
    onClose();
  };

  const filterRoutes = (routes: any[] | undefined, excludeOwn: boolean = false) => {
    if (!routes) return [];
    let filtered = routes;
    
    // Excluir rutas propias si se solicita (para pestaña de rutas públicas)
    if (excludeOwn && user?.id) {
      filtered = filtered.filter(route => route.creator_id !== user.id);
    }
    
    // Filtrar por término de búsqueda
    return filtered.filter(
      (route) =>
        route.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const RouteList = ({ routes, loading, excludeOwn = false }: { routes: any[] | undefined; loading: boolean; excludeOwn?: boolean }) => {
    const filtered = filterRoutes(routes, excludeOwn);

    if (loading) {
      return (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-4xl mb-2">🔍</div>
          <p>No se encontraron rutas</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filtered.map((route) => {
          const isSelected = selected.includes(route.id);
          return (
            <div
              key={route.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => handleToggleRoute(route.id)}
            >
              <div className="flex items-start gap-3">
                {(route.thumbnail_url || route.cover_url) && (
                  <img
                    src={route.thumbnail_url || route.cover_url}
                    alt={route.title}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold truncate flex-1">{route.title}</h4>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                  {route.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2 break-words">
                      {route.description.length > 80 
                        ? `${route.description.substring(0, 80)}...` 
                        : route.description}
                    </p>
                  )}
                  {route.profiles && (
                    <div className="flex items-center gap-2 mb-2">
                      {route.profiles.avatar_url && (
                        <img
                          src={route.profiles.avatar_url}
                          alt={route.profiles.username}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      )}
                      <span className="text-xs text-muted-foreground truncate">
                        por {route.profiles.full_name || route.profiles.username}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {route.subject && (
                      <Badge variant="secondary" className="text-xs">
                        {route.subject}
                      </Badge>
                    )}
                    {route.grade_level && (
                      <Badge variant="outline" className="text-xs">
                        {route.grade_level}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      ⚡ {route.total_xp || 0} XP
                    </span>
                    {route.status === "published" && (
                      <Badge className="text-xs bg-green-500/10 text-green-500 border-green-500/20 whitespace-nowrap">
                        Publicada
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Seleccionar rutas prerequisito</DialogTitle>
          <DialogDescription>
            Los estudiantes deberán completar estas rutas antes de acceder a la nueva ruta
          </DialogDescription>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar rutas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="my" className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my">Mis rutas</TabsTrigger>
            <TabsTrigger value="public">Rutas públicas</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="my" className="mt-0">
              <RouteList routes={myPaths} loading={loadingMyPaths} />
            </TabsContent>

            <TabsContent value="public" className="mt-0">
              <RouteList routes={publicPaths} loading={loadingPublicPaths} excludeOwn={true} />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar ({selected.length} seleccionadas)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
