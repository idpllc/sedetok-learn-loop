import { useEffect } from "react";
import { CheckCircle2, AlertCircle, Clock, Trophy, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePathContent, useLearningPaths } from "@/hooks/useLearningPaths";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { subjects } from "@/lib/subjects";

interface PathReviewProps {
  data: any;
  onChange: (data: any) => void;
  pathId: string | null;
  onCanPublishChange?: (canPublish: boolean) => void;
}

export const PathReview = ({ data, onChange, pathId, onCanPublishChange }: PathReviewProps) => {
  const { contents, isLoading } = usePathContent(pathId || undefined);
  const { paths: requiredPaths } = useLearningPaths();

  const totalDuration = contents?.reduce((acc, item: any) => 
    acc + (item.estimated_time_minutes || 0), 0) || 0;
  
  const totalXP = contents?.reduce((acc, item: any) => 
    acc + (item.xp_reward || 0), 0) || 0;

  // Actualizar estimated_duration y total_xp cuando se calculen (sin sobrescribir manualmente con 0)
  useEffect(() => {
    const updates: any = {};
    if (totalDuration > 0 && totalDuration !== (data.estimated_duration ?? 0)) {
      updates.estimated_duration = totalDuration;
    }
    if (totalXP !== (data.total_xp ?? 0)) {
      updates.total_xp = totalXP;
    }
    if (Object.keys(updates).length > 0) {
      onChange((prev: any) => ({ ...prev, ...updates }));
    }
  }, [totalDuration, totalXP]);

  const requiredRoutesData = requiredPaths?.filter(path => 
    data.required_routes?.includes(path.id)
  ) || [];

  const subjectLabel = data.subject
    ? (subjects.find(s => s.value === data.subject)?.label || subjects.find(s => s.label === data.subject)?.label || data.subject)
    : "";

  const checklist = [
    {
      label: "Título definido",
      checked: !!data.title,
      required: true,
    },
    {
      label: "Descripción agregada",
      checked: !!data.description,
      required: false,
    },
    {
      label: "Objetivos definidos",
      checked: !!data.objectives,
      required: false,
    },
    {
      label: "Asignatura seleccionada",
      checked: !!data.subject,
      required: true,
    },
    {
      label: "Grado definido",
      checked: !!data.grade_level,
      required: true,
    },
    {
      label: "Al menos 3 cápsulas agregadas",
      checked: (contents?.length || 0) >= 3,
      required: true,
    },
  ];

  const canPublish = checklist.filter(item => item.required).every(item => item.checked);

  // Notificar al padre cuando cambie canPublish
  useEffect(() => {
    onCanPublishChange?.(canPublish);
  }, [canPublish, onCanPublishChange]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {canPublish ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            )}
            Lista de verificación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {checklist.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      item.checked
                        ? "bg-green-500 text-white"
                        : "border-2 border-muted"
                    }`}
                  >
                    {item.checked && <CheckCircle2 className="w-3 h-3" />}
                  </div>
                  <span className={item.checked ? "text-foreground" : "text-muted-foreground"}>
                    {item.label}
                  </span>
                </div>
                {item.required && <Badge variant="secondary">Requerido</Badge>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {!canPublish && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Completa todos los campos requeridos antes de publicar la ruta
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Resumen de la ruta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">{data.title || "Sin título"}</h3>
            {data.description && (
              <p className="text-muted-foreground">{data.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-2xl mb-1">📚</div>
              <div className="text-2xl font-bold">{contents?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Cápsulas</div>
            </div>

            <div className="text-center p-4 rounded-lg bg-muted">
              <Clock className="w-6 h-6 mx-auto mb-1 text-primary" />
              <div className="text-2xl font-bold">{totalDuration > 0 ? totalDuration : (data.estimated_duration ?? 0)}</div>
              <div className="text-sm text-muted-foreground">Minutos</div>
            </div>

            <div className="text-center p-4 rounded-lg bg-muted">
              <Trophy className="w-6 h-6 mx-auto mb-1 text-primary" />
              <div className="text-2xl font-bold">{totalXP}</div>
              <div className="text-sm text-muted-foreground">XP Total</div>
            </div>

            <div className="text-center p-4 rounded-lg bg-muted">
              <Lock className="w-6 h-6 mx-auto mb-1 text-primary" />
              <div className="text-2xl font-bold">{requiredRoutesData.length}</div>
              <div className="text-sm text-muted-foreground">Prerequisitos</div>
            </div>
          </div>

          {data.objectives && (
            <div>
              <h4 className="font-semibold mb-2">Objetivos de aprendizaje</h4>
              <p className="text-muted-foreground">{data.objectives}</p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {subjectLabel && <Badge>{subjectLabel}</Badge>}
            {data.grade_level && <Badge variant="outline">{data.grade_level}</Badge>}
            {data.level && <Badge variant="secondary">{data.level}</Badge>}
            {data.is_public && <Badge className="bg-green-500">Pública</Badge>}
          </div>

          {requiredRoutesData.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Rutas prerequisito
              </h4>
              <div className="space-y-2">
                {requiredRoutesData.map((route) => (
                  <Card key={route.id} className="p-3">
                    <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium">{route.title}</h5>
                    <p className="text-sm text-muted-foreground">
                      {route.subject || route.category} • {route.grade_level}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {route.total_xp || 0} XP
                  </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vista previa de cápsulas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : contents && contents.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {contents.map((item: any, index) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">
                        {item.content?.content_type === 'video' ? '🎥' : 
                         item.content?.content_type === 'lectura' ? '📖' :
                         item.content?.content_type === 'documento' ? '📄' : '❓'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-muted-foreground">
                            #{index + 1}
                          </span>
                          <h4 className="font-medium">{item.content?.title}</h4>
                        </div>
                        {item.content?.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.content.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {item.is_required && (
                            <Badge variant="secondary" className="text-xs">
                              Obligatoria
                            </Badge>
                          )}
                          {item.estimated_time_minutes > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ⏱️ {item.estimated_time_minutes} min
                            </span>
                          )}
                          {item.xp_reward > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ⚡ {item.xp_reward} XP
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-2">📭</div>
              <p>No hay cápsulas agregadas</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
