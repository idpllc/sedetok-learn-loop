import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  related_id?: string;
  related_type?: string;
  read: boolean;
  email_sent: boolean;
  email_sent_at?: string;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  email_new_follower: boolean;
  email_new_comment: boolean;
  email_new_like: boolean;
  email_path_update: boolean;
  email_evaluation_result: boolean;
  email_mention: boolean;
  created_at: string;
  updated_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch notifications
  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  // Fetch notification preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // Create default preferences if they don't exist
        const { data: newPrefs, error: insertError } = await supabase
          .from("notification_preferences")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        return newPrefs as NotificationPreferences;
      }

      return data as NotificationPreferences;
    },
    enabled: !!user,
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({
        title: "Notificaciones marcadas como leídas",
        description: "Todas tus notificaciones han sido marcadas como leídas.",
      });
    },
  });

  // Update notification preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("notification_preferences")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast({
        title: "Preferencias actualizadas",
        description: "Tus preferencias de notificación han sido guardadas.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron actualizar las preferencias.",
        variant: "destructive",
      });
    },
  });

  // Send notification (this will trigger email if preferences allow)
  const sendNotificationMutation = useMutation({
    mutationFn: async ({
      userId,
      notificationType,
      title,
      message,
      relatedId,
      relatedType,
    }: {
      userId: string;
      notificationType: string;
      title: string;
      message: string;
      relatedId?: string;
      relatedType?: string;
    }) => {
      const [emailResult, pushResult] = await Promise.all([
        supabase.functions.invoke("send-email-notification", {
          body: {
            userId,
            notificationType,
            title,
            message,
            relatedId,
            relatedType,
          },
        }),
        supabase.functions.invoke("send-push-notification", {
          body: {
            userId,
            title,
            message,
          },
        }),
      ]);

      if (emailResult.error) throw emailResult.error;
      return { email: emailResult.data, push: pushResult.data, pushError: pushResult.error };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  return {
    notifications,
    notificationsLoading,
    preferences,
    preferencesLoading,
    unreadCount,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    updatePreferences: updatePreferencesMutation.mutate,
    sendNotification: sendNotificationMutation.mutate,
  };
};
