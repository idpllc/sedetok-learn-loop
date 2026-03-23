import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

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
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting
    const rateLimitKey = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(rateLimitKey)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Maximum 60 requests per minute.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const documento = url.searchParams.get('documento');
    const q = url.searchParams.get('q');
    const tipo = url.searchParams.get('tipo'); // quiz, game, path, or empty for all
    const estado = url.searchParams.get('estado'); // activa, finalizada, programada
    const fechaDesde = url.searchParams.get('fecha_desde'); // YYYY-MM-DD
    const fechaHasta = url.searchParams.get('fecha_hasta'); // YYYY-MM-DD
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const page = Math.max(parseInt(url.searchParams.get('page') || '1'), 1);
    const sort = url.searchParams.get('sort') || 'created_desc';

    if (!documento) {
      return new Response(
        JSON.stringify({ error: 'Query parameter "documento" is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find user by document number
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, institution')
      .eq('numero_documento', documento.trim())
      .maybeSingle();

    if (profileError) {
      console.error('Profile lookup error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Error looking up user by document number' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile) {
      return new Response(
        JSON.stringify({
          error: 'No user found with that document number',
          data: [],
          pagination: { page: 1, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query for evaluation events
    let query = supabase
      .from('quiz_evaluation_events')
      .select(
        `id, title, description, start_date, end_date, access_code, 
         require_authentication, allow_multiple_attempts, show_results_immediately, 
         created_at, updated_at, quiz_id, game_id, path_id,
         quizzes:quiz_id (id, title, description, category, grade_level, subject, thumbnail_url),
         games:game_id (id, title, description, game_type, category, grade_level, subject, thumbnail_url),
         learning_paths:path_id (id, title, description, category, grade_level, subject, thumbnail_url)`,
        { count: 'exact' }
      )
      .eq('creator_id', profile.id);

    // Filter by type
    if (tipo === 'quiz') {
      query = query.not('quiz_id', 'is', null).is('game_id', null).is('path_id', null);
    } else if (tipo === 'game') {
      query = query.not('game_id', 'is', null);
    } else if (tipo === 'path') {
      query = query.not('path_id', 'is', null);
    }

    // Filter by status based on current date
    const now = new Date().toISOString();
    if (estado === 'activa') {
      query = query.lte('start_date', now).gte('end_date', now);
    } else if (estado === 'finalizada') {
      query = query.lt('end_date', now);
    } else if (estado === 'programada') {
      query = query.gt('start_date', now);
    }

    // Date range filters
    if (fechaDesde) {
      query = query.gte('created_at', `${fechaDesde}T00:00:00`);
    }
    if (fechaHasta) {
      query = query.lte('created_at', `${fechaHasta}T23:59:59`);
    }

    // Search by title/description
    if (q) {
      const searchTerm = q.trim();
      query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    // Sorting
    switch (sort) {
      case 'start_date_asc':
        query = query.order('start_date', { ascending: true });
        break;
      case 'start_date_desc':
        query = query.order('start_date', { ascending: false });
        break;
      case 'end_date_asc':
        query = query.order('end_date', { ascending: true });
        break;
      case 'end_date_desc':
        query = query.order('end_date', { ascending: false });
        break;
      case 'name_asc':
        query = query.order('title', { ascending: true });
        break;
      case 'created_asc':
        query = query.order('created_at', { ascending: true });
        break;
      case 'created_desc':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform results
    const results = (data || []).map((event: any) => {
      let evaluationType = 'quiz';
      let resource = event.quizzes;
      if (event.game_id) {
        evaluationType = 'game';
        resource = event.games;
      } else if (event.path_id) {
        evaluationType = 'path';
        resource = event.learning_paths;
      }

      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);
      const currentDate = new Date();
      let status = 'programada';
      if (currentDate >= startDate && currentDate <= endDate) {
        status = 'activa';
      } else if (currentDate > endDate) {
        status = 'finalizada';
      }

      return {
        id: event.id,
        title: event.title,
        description: event.description || '',
        evaluation_type: evaluationType,
        status,
        start_date: event.start_date,
        end_date: event.end_date,
        access_code: event.access_code,
        require_authentication: event.require_authentication,
        allow_multiple_attempts: event.allow_multiple_attempts,
        show_results_immediately: event.show_results_immediately,
        created_at: event.created_at,
        resource: resource ? {
          id: resource.id,
          title: resource.title,
          description: resource.description || '',
          category: resource.category,
          grade_level: resource.grade_level,
          subject: resource.subject,
          thumbnail_url: resource.thumbnail_url || '',
          ...(resource.game_type ? { game_type: resource.game_type } : {}),
        } : null,
      };
    });

    const totalPages = Math.ceil((count || 0) / limit);

    return new Response(
      JSON.stringify({
        creator: profile,
        data: results,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
