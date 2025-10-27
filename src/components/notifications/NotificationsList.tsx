import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { Loader2, Bell, CheckCheck, MessageSquare, Heart, UserPlus, BookOpen, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export const NotificationsList = () => {
  const { notifications, notificationsLoading, markAsRead, markAllAsRead, unreadCount } =
    useNotifications();

  if (notificationsLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Card>
    );
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_follower":
        return <UserPlus className="h-5 w-5" />;
      case "new_comment":
        return <MessageSquare className="h-5 w-5" />;
      case "new_like":
        return <Heart className="h-5 w-5" />;
      case "path_update":
        return <BookOpen className="h-5 w-5" />;
      case "evaluation_result":
        return <Trophy className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Notificaciones</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} nuevas</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
              className="flex items-center gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              Marcar todas como leídas
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {notifications && notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-colors ${
                  notification.read
                    ? "bg-background"
                    : "bg-accent/10 border-accent"
                }`}
              >
                <div className="flex gap-3">
                  <div className={`mt-1 ${notification.read ? "text-muted-foreground" : "text-primary"}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-medium ${notification.read ? "text-muted-foreground" : ""}`}>
                        {notification.title}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
                    <p className={`text-sm ${notification.read ? "text-muted-foreground" : "text-foreground"}`}>
                      {notification.message}
                    </p>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                      >
                        Marcar como leída
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No tienes notificaciones</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
