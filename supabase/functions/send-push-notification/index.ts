import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  userId: string;
  title: string;
  message: string;
  url?: string;
  notificationId?: string;
  relatedId?: string;
  relatedType?: string;
}

// Web Push helper functions
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const generateVapidAuthHeader = async (
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<string> => {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  const vapidHeaders = {
    typ: 'JWT',
    alg: 'ES256'
  };

  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  
  const vapidClaims = {
    aud: audience,
    exp: exp,
    sub: 'mailto:info@sedefy.com'
  };

  // For simplicity, using a basic implementation
  // In production, use a proper JWT library
  const header = btoa(JSON.stringify(vapidHeaders));
  const payload = btoa(JSON.stringify(vapidClaims));
  
  return `vapid t=${header}.${payload}, k=${vapidPublicKey}`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { userId, title, message, url, notificationId, relatedId, relatedType }: PushNotificationRequest = await req.json();

    console.log('Sending push notification to user:', userId);

    // Get all push subscriptions for the user
    const { data: subscriptions, error: subsError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      throw subsError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user');
      return new Response(
        JSON.stringify({ message: 'No push subscriptions found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const payload = JSON.stringify({
      title,
      message,
      body: message,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      url: url || '/notifications',
      notificationId,
      relatedId,
      relatedType,
      timestamp: Date.now(),
    });

    console.log('Sending push to', subscriptions.length, 'subscriptions');

    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';

    // Send push notification to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          console.log('Sending to endpoint:', subscription.endpoint);

          const vapidHeaders = {
            'Content-Type': 'application/json',
            'TTL': '86400',
          };

          // Send the notification
          const response = await fetch(subscription.endpoint, {
            method: 'POST',
            headers: {
              ...vapidHeaders,
              'Authorization': await generateVapidAuthHeader(
                subscription.endpoint,
                VAPID_PUBLIC_KEY,
                VAPID_PRIVATE_KEY
              ),
            },
            body: payload,
          });

          if (!response.ok) {
            throw new Error(`Push service responded with ${response.status}`);
          }

          return { 
            success: true, 
            endpoint: subscription.endpoint
          };
        } catch (error) {
          console.error('Error sending to subscription:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { success: false, endpoint: subscription.endpoint, error: errorMessage };
        }
      })
    );

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failCount = results.length - successCount;

    console.log(`Push notifications prepared: ${successCount} succeeded, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        total: subscriptions.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
