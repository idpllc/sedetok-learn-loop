import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface PathProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  pathId: string;
}

export const PathProgressDialog = ({
  open,
  onOpenChange,
  userId,
  pathId,
}: PathProgressDialogProps) => {
  const { data: pathDetails, isLoading: pathLoading } = useQuery({
    queryKey: ["path-details", pathId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_paths")
        .select(`
          *,
          learning_path_content (
            id,
            order_index,
            section_name,
            is_required,
            estimated_time_minutes,
            xp_reward,
            content:content_id (
              id,
              title,
              content_type
            ),
            quiz:quiz_id (
              id,
              title
            ),
            game:game_id (
              id,
              title
            )
          )
        `)
        .eq("id", pathId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!pathId,
  });

  const { data: userProgress, isLoading: progressLoading } = useQuery({
    queryKey: ["user-path-progress", userId, pathId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_path_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("path_id", pathId);
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!userId && !!pathId,
  });

  const isLoading = pathLoading || progressLoading;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cargando progreso...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const sortedContent = pathDetails?.learning_path_content?.sort((a, b) => a.order_index - b.order_index) || [];
  const completedCount = userProgress?.filter((p) => p.completed).length || 0;
  const totalCount = sortedContent.length;
  const completionPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const groupedContent = sortedContent.reduce((acc, item) => {
    const section = item.section_name || "General";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(item);
    return acc;
  }, {} as Record<string, typeof sortedContent>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Progreso en la Ruta</DialogTitle>
        </DialogHeader>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">Resumen de Progreso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Progreso General</span>
                <span className="text-sm font-medium">{completedCount} / {totalCount}</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">{completionPercentage.toFixed(0)}% Completado</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {Object.entries(groupedContent).map(([section, items]) => (
            <div key={section}>
              <h3 className="text-lg font-semibold mb-3">{section}</h3>
              <div className="space-y-2">
                {items.map((item, index) => {
                  const progress = userProgress?.find(
                    (p) => p.content_id === item.content?.id || p.quiz_id === item.quiz?.id
                  );
                  const isCompleted = progress?.completed || false;
                  const itemTitle = item.content?.title || item.quiz?.title || item.game?.title || "Sin título";
                  const itemType = item.content ? item.content.content_type : item.quiz ? "quiz" : "juego";

                  return (
                    <Card key={item.id} className={isCompleted ? "border-green-500" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium">{itemTitle}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {itemType}
                                  </Badge>
                                  {item.is_required && (
                                    <Badge variant="secondary" className="text-xs">
                                      Obligatorio
                                    </Badge>
                                  )}
                                  {item.estimated_time_minutes && (
                                    <span className="text-xs text-muted-foreground">
                                      {item.estimated_time_minutes} min
                                    </span>
                                  )}
                                  {item.xp_reward && (
                                    <span className="text-xs text-muted-foreground">
                                      +{item.xp_reward} XP
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isCompleted && progress?.completed_at && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(progress.completed_at).toLocaleDateString('es')}
                                </span>
                              )}
                            </div>
                            {progress?.progress_data && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                <pre className="text-xs bg-muted p-2 rounded">
                                  {JSON.stringify(progress.progress_data, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
