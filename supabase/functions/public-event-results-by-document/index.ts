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
    const accessCode = url.searchParams.get('access_code')?.trim();
    const eventId = url.searchParams.get('event_id')?.trim();

    if (!documento) {
      return new Response(JSON.stringify({ error: 'Query parameter "documento" is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!accessCode && !eventId) {
      return new Response(JSON.stringify({ error: 'Provide "access_code" or "event_id"' }), {
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
      return new Response(JSON.stringify({ error: 'No user found with that document number' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find event by access_code or event_id
    let eventQuery = supabase
      .from('quiz_evaluation_events')
      .select(`
        id, title, description, start_date, end_date, access_code,
        quiz_id, game_id, path_id,
        quizzes:quiz_id (id, title, thumbnail_url, subject, grade_level),
        games:game_id (id, title, thumbnail_url, subject, grade_level, game_type),
        learning_paths:path_id (id, title, thumbnail_url, subject, grade_level)
      `);

    if (eventId) eventQuery = eventQuery.eq('id', eventId);
    else eventQuery = eventQuery.eq('access_code', accessCode!.toUpperCase());

    const { data: event, error: eventError } = await eventQuery.maybeSingle();

    if (eventError) {
      console.error('Event lookup error:', eventError);
      return new Response(JSON.stringify({ error: 'Error fetching event' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let evaluationType: 'quiz' | 'game' | 'path' = 'quiz';
    let resource: any = event.quizzes;
    if (event.game_id) { evaluationType = 'game'; resource = event.games; }
    else if (event.path_id) { evaluationType = 'path'; resource = event.learning_paths; }

    // Fetch attempts/results for this user in this event
    let attempts: any[] = [];
    if (event.path_id) {
      const { data, error } = await supabase
        .from('user_path_results')
        .select('id, total_items, completed_items, completion_percentage, passed, started_at, completed_at, created_at')
        .eq('evaluation_event_id', event.id)
        .eq('user_id', profile.id)
        .order('completed_at', { ascending: false, nullsFirst: false });
      if (error) console.error('Path results error:', error);
      attempts = (data || []).map((r) => ({
        id: r.id,
        type: 'path',
        total_items: r.total_items,
        completed_items: r.completed_items,
        completion_percentage: r.completion_percentage,
        passed: r.passed,
        started_at: r.started_at,
        completed_at: r.completed_at,
      }));
    } else {
      const { data, error } = await supabase
        .from('user_quiz_results')
        .select('id, score, total_questions, correct_answers, passed, time_spent, completed_at')
        .eq('evaluation_event_id', event.id)
        .eq('user_id', profile.id)
        .order('completed_at', { ascending: false });
      if (error) console.error('Quiz results error:', error);
      attempts = (data || []).map((r) => ({
        id: r.id,
        type: evaluationType,
        score: r.score,
        total_questions: r.total_questions,
        correct_answers: r.correct_answers,
        passed: r.passed,
        time_spent_seconds: r.time_spent,
        completed_at: r.completed_at,
      }));
    }

    // Build summary
    const totalAttempts = attempts.length;
    const bestAttempt = attempts.reduce((best: any, a: any) => {
      if (!best) return a;
      if (evaluationType === 'path') {
        return (a.completion_percentage ?? 0) > (best.completion_percentage ?? 0) ? a : best;
      }
      return (a.score ?? 0) > (best.score ?? 0) ? a : best;
    }, null as any);

    return new Response(JSON.stringify({
      user: {
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        numero_documento: profile.numero_documento,
        institution: profile.institution,
      },
      event: {
        id: event.id,
        title: event.title,
        description: event.description || '',
        evaluation_type: evaluationType,
        access_code: event.access_code,
        start_date: event.start_date,
        end_date: event.end_date,
        url: `${SEDEFY_DOMAIN}/quiz-evaluation/${event.access_code}`,
        results_url: `${SEDEFY_DOMAIN}/quiz-evaluations/results/${event.id}`,
        resource: resource ? {
          id: resource.id,
          title: resource.title,
          subject: resource.subject,
          grade_level: resource.grade_level,
          thumbnail_url: resource.thumbnail_url || '',
          ...(resource.game_type ? { game_type: resource.game_type } : {}),
        } : null,
      },
      summary: {
        total_attempts: totalAttempts,
        has_attempted: totalAttempts > 0,
        best: bestAttempt,
      },
      attempts,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
