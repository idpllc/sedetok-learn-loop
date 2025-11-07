import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  userId: string;
  notificationType: string;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
}

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

    const { userId, notificationType, title, message, relatedId, relatedType }: EmailRequest = await req.json();

    console.log('Processing email notification:', { userId, notificationType });

    // Get user preferences (optional)
    const { data: preferences, error: prefsError } = await supabaseClient
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (prefsError && prefsError.code !== 'PGRST116') {
      console.error('Error fetching preferences:', prefsError);
      throw prefsError;
    }

    // Check if email is enabled and specific notification type is enabled
    const emailFieldMap: { [key: string]: string } = {
      'new_follower': 'email_new_follower',
      'new_comment': 'email_new_comment',
      'new_like': 'email_new_like',
      'path_update': 'email_path_update',
      'evaluation_result': 'email_evaluation_result',
      'mention': 'email_mention',
      'trivia_invitation': 'email_new_follower', // Use existing preference
    };

    const emailField = emailFieldMap[notificationType];
    const emailEnabled = preferences ? preferences.email_enabled !== false : true;
    const typeEnabled = emailField ? (preferences ? preferences[emailField] !== false : true) : true;
    if (!emailEnabled || !typeEnabled) {
      console.log('Email notifications disabled for this type');
      return new Response(
        JSON.stringify({ message: 'Email notifications disabled for this type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get user email
    const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
    if (userError || !user?.email) {
      console.error('Error fetching user email:', userError);
      throw new Error('User email not found');
    }

    // Create notification record
    const { data: notification, error: notifError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: userId,
        type: notificationType,
        title,
        message,
        related_id: relatedId,
        related_type: relatedType,
      })
      .select()
      .single();

    if (notifError) {
      console.error('Error creating notification:', notifError);
      throw notifError;
    }

    // Send email using SendGrid
    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendGridApiKey) {
      throw new Error('SENDGRID_API_KEY not configured');
    }

    const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'info@sedefy.com';
    const fromName = Deno.env.get('SENDGRID_FROM_NAME') || 'SEDEFY';

    const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: user.email }],
            subject: title,
          },
        ],
        from: {
          email: fromEmail,
          name: fromName,
        },
        reply_to: {
          email: fromEmail,
          name: fromName,
        },
        content: [
          {
            type: 'text/html',
            value: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
                  <div style="background: linear-gradient(135deg, hsl(165, 89%, 14%) 0%, hsl(165, 89%, 24%) 100%); padding: 30px 20px; border-radius: 10px 10px 0 0; text-align: center;">
                    <img src="${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/assets/sedefy-logo.png" 
                         alt="SEDEFY" 
                         style="height: 60px;">
                  </div>
                  <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 20px rgba(2, 89, 69, 0.1);">
                    <h2 style="color: hsl(165, 89%, 14%); margin-top: 0; font-size: 22px;">${title}</h2>
                    <p style="font-size: 16px; color: #333; line-height: 1.8;">${message}</p>
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid hsl(158, 64%, 52%); text-align: center;">
                      <a href="${Deno.env.get('CUSTOM_DOMAIN') || 'https://sedefy.com'}" 
                         style="display: inline-block; background: linear-gradient(135deg, hsl(165, 89%, 14%), hsl(165, 89%, 24%)); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(2, 89, 69, 0.2);">
                        Ver en SEDEFY
                      </a>
                    </div>
                    <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #e5e5e5; padding-top: 20px;">
                      Si no deseas recibir estas notificaciones, puedes configurar tus preferencias en tu perfil.
                    </p>
                  </div>
                  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                    <p style="margin: 0;">© 2024 SEDEFY. Todos los derechos reservados.</p>
                  </div>
                </body>
              </html>
            `,
          },
        ],
      }),
    });

    console.log('SendGrid response status:', emailResponse.status);
    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('SendGrid error:', errorText);
      throw new Error(`SendGrid error: ${errorText}`);
    }

    // Update notification as sent
    await supabaseClient
      .from('notifications')
      .update({ email_sent: true, email_sent_at: new Date().toISOString() })
      .eq('id', notification.id);

    console.log('Email sent successfully to:', user.email);

    return new Response(
      JSON.stringify({ success: true, notificationId: notification.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-email-notification:', error);
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
