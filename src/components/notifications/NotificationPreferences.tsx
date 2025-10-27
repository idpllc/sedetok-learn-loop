import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/hooks/useNotifications";
import { PushNotificationSettings } from "./PushNotificationSettings";
import { Loader2, Mail, Bell } from "lucide-react";

export const NotificationPreferences = () => {
  const { preferences, preferencesLoading, updatePreferences } = useNotifications();

  if (preferencesLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Card>
    );
  }

  if (!preferences) return null;

  const handleToggle = (field: string, value: boolean) => {
    updatePreferences({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Notificaciones por Email</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email_enabled" className="flex flex-col gap-1">
                <span className="font-medium">Habilitar notificaciones por email</span>
                <span className="text-sm text-muted-foreground">
                  Recibir notificaciones en tu correo electrónico
                </span>
              </Label>
              <Switch
                id="email_enabled"
                checked={preferences.email_enabled}
                onCheckedChange={(checked) => handleToggle("email_enabled", checked)}
              />
            </div>
          </div>
        </div>

        {preferences.email_enabled && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Bell className="h-5 w-5 text-primary" />
                <h4 className="font-medium">Tipos de notificaciones</h4>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email_new_follower" className="flex flex-col gap-1">
                    <span className="font-medium">Nuevos seguidores</span>
                    <span className="text-sm text-muted-foreground">
                      Cuando alguien comienza a seguirte
                    </span>
                  </Label>
                  <Switch
                    id="email_new_follower"
                    checked={preferences.email_new_follower}
                    onCheckedChange={(checked) => handleToggle("email_new_follower", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email_new_comment" className="flex flex-col gap-1">
                    <span className="font-medium">Nuevos comentarios</span>
                    <span className="text-sm text-muted-foreground">
                      Cuando alguien comenta en tu contenido
                    </span>
                  </Label>
                  <Switch
                    id="email_new_comment"
                    checked={preferences.email_new_comment}
                    onCheckedChange={(checked) => handleToggle("email_new_comment", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email_new_like" className="flex flex-col gap-1">
                    <span className="font-medium">Nuevos likes</span>
                    <span className="text-sm text-muted-foreground">
                      Cuando alguien da like a tu contenido
                    </span>
                  </Label>
                  <Switch
                    id="email_new_like"
                    checked={preferences.email_new_like}
                    onCheckedChange={(checked) => handleToggle("email_new_like", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email_path_update" className="flex flex-col gap-1">
                    <span className="font-medium">Actualizaciones de rutas</span>
                    <span className="text-sm text-muted-foreground">
                      Cuando se actualiza una ruta que sigues
                    </span>
                  </Label>
                  <Switch
                    id="email_path_update"
                    checked={preferences.email_path_update}
                    onCheckedChange={(checked) => handleToggle("email_path_update", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email_evaluation_result" className="flex flex-col gap-1">
                    <span className="font-medium">Resultados de evaluaciones</span>
                    <span className="text-sm text-muted-foreground">
                      Cuando están disponibles los resultados de un quiz o juego
                    </span>
                  </Label>
                  <Switch
                    id="email_evaluation_result"
                    checked={preferences.email_evaluation_result}
                    onCheckedChange={(checked) =>
                      handleToggle("email_evaluation_result", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="email_mention" className="flex flex-col gap-1">
                    <span className="font-medium">Menciones</span>
                    <span className="text-sm text-muted-foreground">
                      Cuando alguien te menciona en un comentario
                    </span>
                  </Label>
                  <Switch
                    id="email_mention"
                    checked={preferences.email_mention}
                    onCheckedChange={(checked) => handleToggle("email_mention", checked)}
                  />
                </div>
              </div>
            </div>
          </>
        )}
        </div>
      </Card>

      <PushNotificationSettings />
    </div>
  );
};
