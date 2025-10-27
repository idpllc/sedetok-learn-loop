import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, BellOff, Smartphone, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const PushNotificationSettings = () => {
  const {
    permission,
    isSubscribed,
    isLoading,
    subscribeToPush,
    unsubscribeFromPush,
    isSupported,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tu navegador no soporta notificaciones push. Prueba con Chrome,
            Firefox, Edge o Safari en iOS 16.4+.
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Notificaciones Push</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Recibe notificaciones instantáneas en tu dispositivo, incluso cuando
            el navegador esté cerrado.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {isSubscribed ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label className="font-medium">
                  Estado de notificaciones push
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isSubscribed
                    ? "Habilitadas en este dispositivo"
                    : "Deshabilitadas"}
                </p>
              </div>
            </div>
            <Button
              onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
              disabled={isLoading}
              variant={isSubscribed ? "outline" : "default"}
            >
              {isLoading
                ? "Procesando..."
                : isSubscribed
                ? "Deshabilitar"
                : "Habilitar"}
            </Button>
          </div>

          {permission === "denied" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Has bloqueado las notificaciones. Para habilitarlas, ve a la
                configuración de tu navegador y permite las notificaciones para
                este sitio.
              </AlertDescription>
            </Alert>
          )}

          {isSubscribed && (
            <Alert>
              <Bell className="h-4 w-4" />
              <AlertDescription>
                Este dispositivo recibirá notificaciones push según tus
                preferencias de email configuradas arriba. Las notificaciones se
                enviarán tanto por email como push cuando estén habilitadas.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Sobre las notificaciones push</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Funcionan incluso con el navegador cerrado</li>
            <li>• Se muestran en tiempo real</li>
            <li>• Puedes deshabilitarlas en cualquier momento</li>
            <li>• No compartimos tu información con terceros</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};
