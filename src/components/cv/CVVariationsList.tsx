import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Star, Trash2, Eye, Edit, Calendar, Building2, Sparkles } from "lucide-react";
import { useCVVariations } from "@/hooks/useCVVariations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CVVariationsListProps {
  userId: string;
  onCreateNew: () => void;
  onView: (variation: any) => void;
  onEdit: (variation: any) => void;
}

export const CVVariationsList = ({ userId, onCreateNew, onView, onEdit }: CVVariationsListProps) => {
  const { variations, isLoading, deleteVariation, toggleFavorite } = useCVVariations(userId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-pulse">Cargando variaciones...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Mis Variaciones de CV
            </CardTitle>
            <CardDescription>
              Gestiona diferentes versiones de tu hoja de vida para distintas oportunidades
            </CardDescription>
          </div>
          <Button onClick={onCreateNew}>
            + Nueva Variación
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!variations || variations.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
            <div>
              <p className="text-lg font-medium">No tienes variaciones aún</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crea versiones personalizadas de tu CV para diferentes cargos
              </p>
            </div>
            <Button onClick={onCreateNew} variant="outline">
              Crear mi primera variación
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {variations.map((variation) => (
              <Card key={variation.id} className="relative">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {/* Header con título y favorito */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg line-clamp-1">
                          {variation.title}
                        </h3>
                        <p className="text-sm text-primary font-medium mt-1">
                          {variation.target_position}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => toggleFavorite.mutate({
                          id: variation.id,
                          isFavorite: variation.is_favorite,
                        })}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            variation.is_favorite
                              ? "fill-yellow-500 text-yellow-500"
                              : "text-muted-foreground"
                          }`}
                        />
                      </Button>
                    </div>

                    {/* Empresa si existe */}
                    {variation.company_name && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="w-4 h-4" />
                        {variation.company_name}
                      </div>
                    )}

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      {variation.created_with_ai && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Generada con IA
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(variation.created_at).toLocaleDateString()}
                      </Badge>
                    </div>

                    {/* Biografía personalizada preview */}
                    {variation.custom_bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {variation.custom_bio}
                      </p>
                    )}

                    {/* Acciones */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(variation)}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(variation)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar variación?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará permanentemente
                              la variación "{variation.title}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteVariation.mutate(variation.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};