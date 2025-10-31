import { useState } from "react";
import { Link } from "react-router-dom";
import { MoreVertical, Edit, Copy, Share2, Eye, EyeOff, Trash2, User } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useLearningPaths } from "@/hooks/useLearningPaths";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";

interface PathCardProps {
  path: any;
}

export const PathCard = ({ path }: PathCardProps) => {
  
  const { user } = useAuth();
  const { updatePath, deletePath } = useLearningPaths();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const isCreator = Boolean(user?.id && path?.creator_id && user.id === path.creator_id);

  const handleToggleVisibility = async () => {
    await updatePath.mutateAsync({
      id: path.id,
      updates: { is_public: !path.is_public },
    });
  };

  const handleDelete = async () => {
    await deletePath.mutateAsync(path.id);
    setShowDeleteDialog(false);
  };

  const handleDuplicate = async () => {
    // TODO: Implementar duplicación
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "draft": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "archived": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "published": return "Publicada";
      case "draft": return "Borrador";
      case "archived": return "Archivada";
      default: return status;
    }
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
        <Link
          to={`/learning-paths/view/${path.id}`}
          className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 relative block"
        >
          {path.cover_url || path.thumbnail_url ? (
            <img
              src={path.cover_url || path.thumbnail_url}
              alt={path.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">
              🗺️
            </div>
          )}
          <div className="absolute top-2 right-2 flex gap-2">
            <Badge className={getStatusColor(path.status)}>
              {getStatusLabel(path.status)}
            </Badge>
            {path.is_public && (
              <Badge variant="secondary">Pública</Badge>
            )}
          </div>
        </Link>

        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {path.title}
          </h3>
          {path.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {path.description}
            </p>
          )}
          
          {/* Creator info */}
          <div className="flex flex-col gap-2 mb-3">
            {path.profiles && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="w-3 h-3" />
                <span>Ruta por: {path.profiles.full_name || path.profiles.username}</span>
              </div>
            )}
            {path.course_routes?.[0]?.courses?.profiles && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="w-3 h-3" />
                <span>Curso por: {path.course_routes[0].courses.profiles.full_name || path.course_routes[0].courses.profiles.username}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>⚡ {path.total_xp} XP</span>
            <span>⏱️ {path.estimated_duration} min</span>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 flex justify-between items-center">
          <div className="flex gap-2">
            {path.subject && (
              <Badge variant="outline" className="text-xs">
                {path.subject}
              </Badge>
            )}
            {path.grade_level && (
              <Badge variant="outline" className="text-xs">
                {path.grade_level}
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isCreator && (
                <>
                  <DropdownMenuItem asChild>
                    <Link to={`/learning-paths/edit/${path.id}`}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleToggleVisibility}>
                    {path.is_public ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Hacer privada
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Hacer pública
                      </>
                    )}
                  </DropdownMenuItem>
                </>
              )}
              {!isCreator && (
                <DropdownMenuItem asChild>
                  <Link to={`/learning-paths/create?clone=${path.id}`}>
                    <Copy className="w-4 h-4 mr-2" />
                    Clonar
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Share2 className="w-4 h-4 mr-2" />
                Compartir
              </DropdownMenuItem>
              {isCreator && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ruta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la ruta
              "{path.title}" y todo su contenido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
