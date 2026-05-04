import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const emailFieldMap: Record<string, string> = {
  'new_follower': 'email_new_follower',
  'new_comment': 'email_new_comment',
  'new_like': 'email_new_like',
  'path_update': 'email_path_update',
  'evaluation_result': 'email_evaluation_result',
  'mention': 'email_mention',
  'trivia_invitation': 'email_new_follower',
  'level_up': 'email_level_up',
  'path_enrollment': 'email_path_enrollment',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { notificationId } = await req.json();
    if (!notificationId) throw new Error('notificationId required');

    const { data: notification, error: nErr } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .maybeSingle();
    if (nErr) throw nErr;
    if (!notification) throw new Error('Notification not found');
    if (notification.email_sent) {
      return new Response(JSON.stringify({ skipped: 'already_sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', notification.user_id)
      .maybeSingle();

    const emailEnabled = prefs ? prefs.email_enabled !== false : true;
    const field = emailFieldMap[notification.type];
    const typeEnabled = field ? (prefs ? (prefs as any)[field] !== false : true) : true;
    if (!emailEnabled || !typeEnabled) {
      return new Response(JSON.stringify({ skipped: 'pref_disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    const { data: { user }, error: uErr } = await supabase.auth.admin.getUserById(notification.user_id);
    if (uErr || !user?.email) throw new Error('User email not found');

    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendGridApiKey) throw new Error('SENDGRID_API_KEY not configured');
    const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'info@sedefy.com';
    const fromName = Deno.env.get('SENDGRID_FROM_NAME') || 'SEDEFY';
    const domain = Deno.env.get('CUSTOM_DOMAIN') || 'https://sedefy.com';

    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
  <div style="background:linear-gradient(135deg,hsl(165,89%,14%),hsl(165,89%,24%));padding:30px;border-radius:10px 10px 0 0;text-align:center;color:white;font-size:22px;font-weight:bold;">SEDEFY</div>
  <div style="background:white;padding:30px;border-radius:0 0 10px 10px;">
    <h2 style="color:hsl(165,89%,14%);margin-top:0;">${notification.title}</h2>
    <p style="font-size:16px;">${notification.message}</p>
    <div style="margin-top:30px;text-align:center;">
      <a href="${domain}" style="display:inline-block;background:linear-gradient(135deg,hsl(165,89%,14%),hsl(165,89%,24%));color:white;padding:14px 35px;text-decoration:none;border-radius:8px;font-weight:bold;">Ver en SEDEFY</a>
    </div>
    <p style="margin-top:30px;font-size:12px;color:#666;text-align:center;">Configura tus preferencias de notificación desde tu perfil.</p>
  </div>
</body></html>`;

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${sendGridApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: user.email }], subject: notification.title }],
        from: { email: fromEmail, name: fromName },
        reply_to: { email: fromEmail, name: fromName },
        content: [{ type: 'text/html', value: html }],
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`SendGrid: ${txt}`);
    }

    await supabase.from('notifications')
      .update({ email_sent: true, email_sent_at: new Date().toISOString() })
      .eq('id', notification.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (e) {
    console.error('email-existing-notification error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
