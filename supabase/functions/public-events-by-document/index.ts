import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const SEDEFY_DOMAIN = 'https://sedefy.com';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 60;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) return false;
  record.count++;
  return true;
}

function getStatus(start: string, end: string): 'programada' | 'activa' | 'finalizada' {
  const now = new Date();
  const s = new Date(start);
  const e = new Date(end);
  if (now < s) return 'programada';
  if (now > e) return 'finalizada';
  return 'activa';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rateKey = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(rateKey)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Max 60 req/min.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const documento = url.searchParams.get('documento')?.trim();
    const estado = url.searchParams.get('estado'); // activa | finalizada | programada
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    if (!documento) {
      return new Response(JSON.stringify({ error: 'Query parameter "documento" is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase: any = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Find user by document
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, numero_documento, institution')
      .eq('numero_documento', documento)
      .maybeSingle();

    if (profileError) {
      console.error('Profile lookup error:', profileError);
      return new Response(JSON.stringify({ error: 'Error looking up user' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!profile) {
      return new Response(JSON.stringify({
        error: 'No user found with that document number',
        data: [],
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get event ids the user has participated in (quiz/game results + path results)
    const [quizResults, pathResults] = await Promise.all([
      supabase
        .from('user_quiz_results')
        .select('evaluation_event_id, completed_at, score, passed')
        .eq('user_id', profile.id)
        .not('evaluation_event_id', 'is', null),
      supabase
        .from('user_path_results')
        .select('evaluation_event_id, completed_at, completion_percentage, passed')
        .eq('user_id', profile.id)
        .not('evaluation_event_id', 'is', null),
    ]);

    const eventIds = new Set<string>();
    (quizResults.data || []).forEach((r: any) => r.evaluation_event_id && eventIds.add(r.evaluation_event_id));
    (pathResults.data || []).forEach((r: any) => r.evaluation_event_id && eventIds.add(r.evaluation_event_id));

    if (eventIds.size === 0) {
      return new Response(JSON.stringify({
        user: profile,
        data: [],
        total: 0,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch events
    const { data: events, error: eventsError } = await supabase
      .from('quiz_evaluation_events')
      .select(`
        id, title, description, start_date, end_date, access_code,
        require_authentication, allow_multiple_attempts, show_results_immediately,
        created_at, quiz_id, game_id, path_id,
        quizzes:quiz_id (id, title, thumbnail_url, subject, grade_level),
        games:game_id (id, title, thumbnail_url, subject, grade_level, game_type),
        learning_paths:path_id (id, title, thumbnail_url, subject, grade_level)
      `)
      .in('id', Array.from(eventIds))
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eventsError) {
      console.error('Events lookup error:', eventsError);
      return new Response(JSON.stringify({ error: 'Error fetching events' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let results = (events || []).map((e: any) => {
      let evaluationType: 'quiz' | 'game' | 'path' = 'quiz';
      let resource = e.quizzes;
      if (e.game_id) { evaluationType = 'game'; resource = e.games; }
      else if (e.path_id) { evaluationType = 'path'; resource = e.learning_paths; }

      const status = getStatus(e.start_date, e.end_date);

      return {
        id: e.id,
        title: e.title,
        description: e.description || '',
        evaluation_type: evaluationType,
        status,
        start_date: e.start_date,
        end_date: e.end_date,
        access_code: e.access_code,
        url: `${SEDEFY_DOMAIN}/quiz-evaluation/${e.access_code}`,
        results_url: `${SEDEFY_DOMAIN}/quiz-evaluations/results/${e.id}`,
        resource: resource ? {
          id: resource.id,
          title: resource.title,
          subject: resource.subject,
          grade_level: resource.grade_level,
          thumbnail_url: resource.thumbnail_url || '',
          ...(resource.game_type ? { game_type: resource.game_type } : {}),
        } : null,
      };
    });

    if (estado === 'activa' || estado === 'finalizada' || estado === 'programada') {
      results = results.filter((r) => r.status === estado);
    }

    return new Response(JSON.stringify({
      user: {
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        numero_documento: profile.numero_documento,
        institution: profile.institution,
      },
      data: results,
      total: results.length,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
