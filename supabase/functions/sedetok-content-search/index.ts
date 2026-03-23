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

    const rateLimitKey = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(rateLimitKey)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Maximum 60 requests per minute.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const q = url.searchParams.get('q');
    const documento = url.searchParams.get('documento');
    const grado = url.searchParams.get('grado');
    const asignatura = url.searchParams.get('asignatura');
    // tipo: video, documento, lectura (content types), ruta, quiz, juego
    const tipo = url.searchParams.get('tipo');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const page = Math.max(parseInt(url.searchParams.get('page') || '1'), 1);
    const sort = url.searchParams.get('sort') || 'created_desc';

    if (!q && !documento) {
      return new Response(
        JSON.stringify({ error: 'Query parameter "q" or "documento" is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Look up creator by document number
    let creatorId: string | null = null;
    let creatorProfile: any = null;
    if (documento) {
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
            pagination: { page: 1, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      creatorId = profile.id;
      creatorProfile = profile;
    }

    const baseUrl = 'https://sedefy.com';

    // Determine which resource types to search
    const resourceTypeMap: Record<string, string> = {
      video: 'content',
      documento: 'content',
      lectura: 'content',
      ruta: 'path',
      quiz: 'quiz',
      juego: 'game',
    };

    let targetSource: string | null = null;
    if (tipo && resourceTypeMap[tipo]) {
      targetSource = resourceTypeMap[tipo];
    }

    // We'll collect results from all applicable sources, then unify
    const searchAll = !targetSource;
    const results: any[] = [];
    let totalCount = 0;

    // Helper: apply sorting string
    const getSortConfig = () => {
      switch (sort) {
        case 'views_desc': return { column: 'views_count', ascending: false };
        case 'likes_desc': return { column: 'likes_count', ascending: false };
        case 'name_asc': return { column: 'title', ascending: true };
        case 'created_asc': return { column: 'created_at', ascending: true };
        case 'created_desc':
        default: return { column: 'created_at', ascending: false };
      }
    };

    const sortCfg = getSortConfig();

    // If searching all types, we query each table independently and merge.
    // If a specific tipo maps to a single source, only query that source.
    // For "all" mode with pagination across tables, we use a simple approach:
    // query all tables (no limit), merge, sort, then paginate in-memory.
    // For single-source mode, we use DB-level pagination.

    const singleSource = !searchAll;

    // ─── CONTENT (cápsulas educativas) ───
    if (searchAll || targetSource === 'content') {
      let cq = supabase
        .from('content')
        .select('id, title, description, thumbnail_url, video_url, document_url, content_type, grade_level, category, subject, tags, views_count, likes_count, created_at, creator_id', { count: 'exact' })
        .eq('is_public', true);

      if (creatorId) cq = cq.eq('creator_id', creatorId);
      if (q) {
        const t = q.trim();
        cq = cq.or(`title.ilike.%${t}%,description.ilike.%${t}%`);
      }
      if (grado) cq = cq.eq('grade_level', grado);
      if (asignatura) cq = cq.ilike('subject', `%${asignatura}%`);
      // If tipo is a content subtype, filter it
      if (tipo && targetSource === 'content') cq = cq.eq('content_type', tipo);

      if (singleSource) {
        cq = cq.order(sortCfg.column, { ascending: sortCfg.ascending });
        const offset = (page - 1) * limit;
        cq = cq.range(offset, offset + limit - 1);
      } else {
        cq = cq.order('created_at', { ascending: false }).limit(500);
      }

      const { data, error, count } = await cq;
      if (!error && data) {
        for (const c of data) {
          results.push({
            id: c.id,
            resource_type: 'capsula',
            name: c.title,
            description: c.description || '',
            thumbnail: c.thumbnail_url || '',
            url: `${baseUrl}/?contentId=${c.id}`,
            content_type: c.content_type,
            subject: c.subject,
            grade_level: c.grade_level,
            tags: c.tags || [],
            views: c.views_count || 0,
            likes: c.likes_count || 0,
            created_at: c.created_at,
          });
        }
        if (singleSource) totalCount = count || 0;
      }
    }

    // ─── LEARNING PATHS (rutas) ───
    if (searchAll || targetSource === 'path') {
      let pq = supabase
        .from('learning_paths')
        .select('id, title, description, thumbnail_url, cover_url, grade_level, category, subject, tags, total_xp, estimated_duration, created_at, creator_id, tipo_aprendizaje, level', { count: 'exact' })
        .eq('is_public', true);

      if (creatorId) pq = pq.eq('creator_id', creatorId);
      if (q) {
        const t = q.trim();
        pq = pq.or(`title.ilike.%${t}%,description.ilike.%${t}%`);
      }
      if (grado) pq = pq.eq('grade_level', grado);
      if (asignatura) pq = pq.ilike('subject', `%${asignatura}%`);

      if (singleSource) {
        const col = sortCfg.column === 'views_count' || sortCfg.column === 'likes_count' ? 'created_at' : sortCfg.column;
        pq = pq.order(col, { ascending: sortCfg.ascending });
        const offset = (page - 1) * limit;
        pq = pq.range(offset, offset + limit - 1);
      } else {
        pq = pq.order('created_at', { ascending: false }).limit(500);
      }

      const { data, error, count } = await pq;
      if (!error && data) {
        for (const p of data) {
          results.push({
            id: p.id,
            resource_type: 'ruta',
            name: p.title,
            description: p.description || '',
            thumbnail: p.thumbnail_url || p.cover_url || '',
            url: `${baseUrl}/learning-paths/view/${p.id}`,
            subject: p.subject,
            grade_level: p.grade_level,
            tags: p.tags || [],
            total_xp: p.total_xp || 0,
            estimated_duration: p.estimated_duration,
            level: p.level,
            views: 0,
            likes: 0,
            created_at: p.created_at,
          });
        }
        if (singleSource) totalCount = count || 0;
      }
    }

    // ─── QUIZZES ───
    if (searchAll || targetSource === 'quiz') {
      let qq = supabase
        .from('quizzes')
        .select('id, title, description, thumbnail_url, grade_level, category, subject, tags, likes_count, saves_count, shares_count, comments_count, created_at, creator_id', { count: 'exact' })
        .eq('is_public', true);

      if (creatorId) qq = qq.eq('creator_id', creatorId);
      if (q) {
        const t = q.trim();
        qq = qq.or(`title.ilike.%${t}%,description.ilike.%${t}%`);
      }
      if (grado) qq = qq.eq('grade_level', grado);
      if (asignatura) qq = qq.ilike('subject', `%${asignatura}%`);

      if (singleSource) {
        const col = sortCfg.column === 'views_count' ? 'created_at' : sortCfg.column;
        qq = qq.order(col, { ascending: sortCfg.ascending });
        const offset = (page - 1) * limit;
        qq = qq.range(offset, offset + limit - 1);
      } else {
        qq = qq.order('created_at', { ascending: false }).limit(500);
      }

      const { data, error, count } = await qq;
      if (!error && data) {
        for (const qz of data) {
          results.push({
            id: qz.id,
            resource_type: 'quiz',
            name: qz.title,
            description: qz.description || '',
            thumbnail: qz.thumbnail_url || '',
            url: `${baseUrl}/?quizId=${qz.id}`,
            subject: qz.subject,
            grade_level: qz.grade_level,
            tags: qz.tags || [],
            views: 0,
            likes: qz.likes_count || 0,
            created_at: qz.created_at,
          });
        }
        if (singleSource) totalCount = count || 0;
      }
    }

    // ─── GAMES (juegos) ───
    if (searchAll || targetSource === 'game') {
      let gq = supabase
        .from('games')
        .select('id, title, description, thumbnail_url, grade_level, category, subject, tags, game_type, time_limit, likes_count, saves_count, shares_count, comments_count, created_at, creator_id', { count: 'exact' })
        .eq('is_public', true);

      if (creatorId) gq = gq.eq('creator_id', creatorId);
      if (q) {
        const t = q.trim();
        gq = gq.or(`title.ilike.%${t}%,description.ilike.%${t}%`);
      }
      if (grado) gq = gq.eq('grade_level', grado);
      if (asignatura) gq = gq.ilike('subject', `%${asignatura}%`);

      if (singleSource) {
        const col = sortCfg.column === 'views_count' ? 'created_at' : sortCfg.column;
        gq = gq.order(col, { ascending: sortCfg.ascending });
        const offset = (page - 1) * limit;
        gq = gq.range(offset, offset + limit - 1);
      } else {
        gq = gq.order('created_at', { ascending: false }).limit(500);
      }

      const { data, error, count } = await gq;
      if (!error && data) {
        for (const g of data) {
          results.push({
            id: g.id,
            resource_type: 'juego',
            name: g.title,
            description: g.description || '',
            thumbnail: g.thumbnail_url || '',
            url: `${baseUrl}/?gameId=${g.id}`,
            game_type: g.game_type,
            time_limit: g.time_limit,
            subject: g.subject,
            grade_level: g.grade_level,
            tags: g.tags || [],
            views: 0,
            likes: g.likes_count || 0,
            created_at: g.created_at,
          });
        }
        if (singleSource) totalCount = count || 0;
      }
    }

    // If searching all, sort and paginate in-memory
    let finalResults = results;
    if (searchAll) {
      // Sort
      finalResults.sort((a, b) => {
        switch (sort) {
          case 'name_asc':
            return (a.name || '').localeCompare(b.name || '');
          case 'views_desc':
            return (b.views || 0) - (a.views || 0);
          case 'likes_desc':
            return (b.likes || 0) - (a.likes || 0);
          case 'created_asc':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'created_desc':
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });

      totalCount = finalResults.length;
      const offset = (page - 1) * limit;
      finalResults = finalResults.slice(offset, offset + limit);
    }

    const totalPages = Math.ceil(totalCount / limit);

    return new Response(
      JSON.stringify({
        ...(creatorProfile ? { creator: creatorProfile } : {}),
        data: finalResults,
        pagination: {
          page,
          limit,
          total: totalCount,
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
