import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TriviaEmailRequest {
  opponentId: string;
  failedPlayerUsername: string;
  matchId: string;
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

    const { opponentId, failedPlayerUsername, matchId }: TriviaEmailRequest = await req.json();

    console.log('Sending trivia turn email:', { opponentId, failedPlayerUsername, matchId });

    // Get opponent's email and notification preferences
    const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(opponentId);
    if (userError || !user?.email) {
      console.error('Error fetching opponent email:', userError);
      throw new Error('Opponent email not found');
    }

    // Check notification preferences
    const { data: preferences, error: prefsError } = await supabaseClient
      .from('notification_preferences')
      .select('*')
      .eq('user_id', opponentId)
      .single();

    if (prefsError) {
      console.error('Error fetching preferences:', prefsError);
    }

    // Check if email notifications are explicitly disabled (default to enabled)
    if (preferences && preferences.email_enabled === false) {
      console.log('Email notifications disabled for user');
      return new Response(
        JSON.stringify({ message: 'Email notifications disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendGridApiKey) {
      throw new Error('SENDGRID_API_KEY not configured');
    }

    const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'info@sedefy.com';
    const fromName = Deno.env.get('SENDGRID_FROM_NAME') || 'Trivia SEDEFY';

    const customDomain = Deno.env.get('CUSTOM_DOMAIN') || 'https://sedefy.com';
    const triviaUrl = `${customDomain}/trivia-game?match=${matchId}`;

    // Send email using SendGrid
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
            subject: '¡Es tu turno en Trivia! 🎮',
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
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f5f5;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <div style="font-size: 60px; margin-bottom: 10px;">🎮</div>
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">¡Es tu turno!</h1>
                  </div>
                  
                  <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
                    <div style="text-align: center; margin-bottom: 25px;">
                      <div style="font-size: 48px; margin-bottom: 15px;">😅</div>
                      <p style="font-size: 18px; color: #555; margin: 0;">
                        <strong>${failedPlayerUsername}</strong> falló una pregunta
                      </p>
                      <p style="font-size: 16px; color: #888; margin-top: 10px;">
                        ¡Ahora es tu oportunidad de brillar!
                      </p>
                    </div>

                    <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 25px 0;">
                      <p style="margin: 0; font-size: 14px; color: #666;">
                        💡 <strong>Consejo:</strong> Recuerda que necesitas 3 respuestas correctas seguidas para ganar un personaje
                      </p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                      <a href="${triviaUrl}" 
                         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                        ¡Jugar Ahora! 🎯
                      </a>
                    </div>

                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                      <p style="font-size: 12px; color: #999; margin: 0;">
                        ¿No deseas recibir estos correos? Puedes configurar tus preferencias en tu perfil.
                      </p>
                    </div>
                  </div>

                  <div style="text-align: center; padding: 20px;">
                    <p style="font-size: 12px; color: #999; margin: 0;">
                      © ${new Date().getFullYear()} SEDEFY - Tu plataforma de aprendizaje
                    </p>
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


    console.log('Email sent successfully to:', user.email);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-trivia-turn-email:', error);
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