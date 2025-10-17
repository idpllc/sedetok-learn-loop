import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

// Rate limiting map (simple in-memory, resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow GET method
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authentication check
    const apiKey = req.headers.get('x-api-key');
    const authHeader = req.headers.get('authorization');
    const expectedApiKey = Deno.env.get('SEDETOK_API_KEY');
    const origin = req.headers.get('origin') || '';
    
    // Allow localhost/development without authentication
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    
    if (!isLocalhost) {
      if (!apiKey && !authHeader) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (apiKey && apiKey !== expectedApiKey) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Rate limiting
    const rateLimitKey = apiKey || req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(rateLimitKey)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Maximum 60 requests per minute.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const q = url.searchParams.get('q');
    const grado = url.searchParams.get('grado');
    const asignatura = url.searchParams.get('asignatura');
    const tipo = url.searchParams.get('tipo'); // video, documento, lectura
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const page = Math.max(parseInt(url.searchParams.get('page') || '1'), 1);
    const sort = url.searchParams.get('sort') || 'relevance_desc';

    if (!q) {
      return new Response(
        JSON.stringify({ error: 'Query parameter "q" is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase
      .from('content')
      .select('id, title, description, thumbnail_url, video_url, document_url, content_type, grade_level, category, subject, tags, views_count, likes_count, created_at', { count: 'exact' })
      .eq('is_public', true);

    // Full-text search on title and description
    const searchTerm = q.trim();
    query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

    // Apply filters
    if (grado) {
      query = query.eq('grade_level', grado);
    }

    if (asignatura) {
      query = query.ilike('subject', `%${asignatura}%`);
    }

    if (tipo) {
      query = query.eq('content_type', tipo);
    }

    // Apply sorting
    switch (sort) {
      case 'created_desc':
        query = query.order('created_at', { ascending: false });
        break;
      case 'views_desc':
        query = query.order('views_count', { ascending: false });
        break;
      case 'likes_desc':
        query = query.order('likes_count', { ascending: false });
        break;
      case 'name_asc':
        query = query.order('title', { ascending: true });
        break;
      case 'relevance_desc':
      default:
        // For relevance, we'll sort by created_at desc as a simple heuristic
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Apply pagination
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

    // Transform results to required format
    // Use custom domain if configured, otherwise fall back to default
    const customDomain = Deno.env.get('CUSTOM_DOMAIN');
    const baseUrl = customDomain || supabaseUrl.replace('.supabase.co', '.lovableproject.com');
    
    const results = (data || []).map(content => ({
      id: content.id,
      name: content.title,
      description: content.description || '',
      thumbnail: content.thumbnail_url || '',
      url: `${baseUrl}/?contentId=${content.id}`,
      type: content.content_type,
      tags: content.tags || [],
      views: content.views_count || 0,
      likes: content.likes_count || 0,
    }));

    const totalPages = Math.ceil((count || 0) / limit);

    return new Response(
      JSON.stringify({
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
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
