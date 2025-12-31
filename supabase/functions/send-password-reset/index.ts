import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordResetRequest {
  email: string;
  redirectUrl: string;
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

    const { email, redirectUrl }: PasswordResetRequest = await req.json();

    console.log('Processing password reset request for:', email);

    // Generate password reset link using Supabase Admin API
    const { data, error: resetError } = await supabaseClient.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (resetError) {
      console.error('Error generating reset link:', resetError);
      // Don't reveal if user exists or not for security
      return new Response(
        JSON.stringify({ success: true, message: 'Si el correo existe, recibirás un enlace de recuperación' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!data?.properties?.action_link) {
      console.error('No action link generated');
      return new Response(
        JSON.stringify({ success: true, message: 'Si el correo existe, recibirás un enlace de recuperación' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const resetLink = data.properties.action_link;

    // Send email using SendGrid
    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendGridApiKey) {
      throw new Error('SENDGRID_API_KEY not configured');
    }

    const customDomain = Deno.env.get('CUSTOM_DOMAIN') || 'https://sedefy.com';

    const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: email }],
            subject: 'Recupera tu contraseña - SEDEFY',
          },
        ],
        from: {
          email: 'noreply@sedefy.com',
          name: 'SEDEFY',
        },
        reply_to: {
          email: 'soporte@sedefy.com',
          name: 'Soporte SEDEFY',
        },
        content: [
          {
            type: 'text/html',
            value: `
              <!DOCTYPE html>
              <html lang="es">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Recuperar contraseña</title>
                </head>
                <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f5f5;">
                  <div style="background: linear-gradient(135deg, #025945 0%, #037a5c 100%); padding: 40px 20px; text-align: center;">
                    <img src="https://sedefy.com/sedefy-logo-white.png" 
                         alt="SEDEFY" 
                         style="height: 50px;"
                         onerror="this.style.display='none'">
                    <h1 style="color: white; margin: 20px 0 0 0; font-size: 24px; font-weight: 600;">SEDEFY</h1>
                  </div>
                  
                  <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #025945; margin-top: 0; font-size: 22px; font-weight: 600;">
                      Recupera tu contraseña
                    </h2>
                    
                    <p style="font-size: 16px; color: #555; margin-bottom: 25px;">
                      Recibimos una solicitud para restablecer la contraseña de tu cuenta SEDEFY. 
                      Haz clic en el siguiente botón para crear una nueva contraseña:
                    </p>
                    
                    <div style="text-align: center; margin: 35px 0;">
                      <a href="${resetLink}" 
                         style="display: inline-block; background: linear-gradient(135deg, #025945, #037a5c); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(2, 89, 69, 0.3);">
                        Restablecer contraseña
                      </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #777; margin-top: 30px;">
                      Si no solicitaste restablecer tu contraseña, puedes ignorar este correo de forma segura. 
                      Tu contraseña actual seguirá siendo válida.
                    </p>
                    
                    <p style="font-size: 13px; color: #999; margin-top: 20px;">
                      Este enlace expirará en 24 horas por razones de seguridad.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    
                    <p style="font-size: 12px; color: #999;">
                      Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                      <a href="${resetLink}" style="color: #025945; word-break: break-all;">${resetLink}</a>
                    </p>
                  </div>
                  
                  <div style="text-align: center; padding: 25px; color: #999; font-size: 12px;">
                    <p style="margin: 0 0 10px 0;">
                      <a href="${customDomain}" style="color: #025945; text-decoration: none;">sedefy.com</a>
                    </p>
                    <p style="margin: 0;">© ${new Date().getFullYear()} SEDEFY. Todos los derechos reservados.</p>
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

    console.log('Password reset email sent successfully to:', email);

    return new Response(
      JSON.stringify({ success: true, message: 'Correo de recuperación enviado' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-password-reset:', error);
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
