/// <reference lib="webworker" />
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// VAPID public key from environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
    checkSubscription();
  }, [user]);

  const checkSubscription = async () => {
    if (!user || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking push subscription:", error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para habilitar notificaciones",
        variant: "destructive",
      });
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast({
        title: "No compatible",
        description: "Tu navegador no soporta notificaciones push",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        toast({
          title: "Permisos denegados",
          description: "Necesitas permitir notificaciones para continuar",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Convert subscription to JSON
      const subscriptionJson = subscription.toJSON();

      // Save subscription to database
      const { error } = await supabase.from("push_subscriptions").insert({
        user_id: user.id,
        endpoint: subscriptionJson.endpoint!,
        p256dh: subscriptionJson.keys!.p256dh,
        auth: subscriptionJson.keys!.auth,
        user_agent: navigator.userAgent,
      });

      if (error) {
        // If it's a duplicate, update the existing one
        if (error.code === "23505") {
          const { error: updateError } = await supabase
            .from("push_subscriptions")
            .update({
              p256dh: subscriptionJson.keys!.p256dh,
              auth: subscriptionJson.keys!.auth,
              user_agent: navigator.userAgent,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id)
            .eq("endpoint", subscriptionJson.endpoint!);

          if (updateError) throw updateError;
        } else {
          throw error;
        }
      }

      setIsSubscribed(true);
      toast({
        title: "¡Notificaciones habilitadas!",
        description: "Ahora recibirás notificaciones push en este dispositivo",
      });
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      toast({
        title: "Error",
        description: "No se pudieron habilitar las notificaciones",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const subscriptionJson = subscription.toJSON();

        // Remove from database
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", subscriptionJson.endpoint!);

        // Unsubscribe from browser
        await subscription.unsubscribe();

        setIsSubscribed(false);
        toast({
          title: "Notificaciones deshabilitadas",
          description: "Ya no recibirás notificaciones push en este dispositivo",
        });
      }
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      toast({
        title: "Error",
        description: "No se pudieron deshabilitar las notificaciones",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    permission,
    isSubscribed,
    isLoading,
    subscribeToPush,
    unsubscribeFromPush,
    isSupported: "serviceWorker" in navigator && "PushManager" in window,
  };
};
