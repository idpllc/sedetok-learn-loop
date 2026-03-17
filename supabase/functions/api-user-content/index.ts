import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

const API_KEY = Deno.env.get("CHAT_JWT_SECRET") || "tucanmistico";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey || apiKey !== API_KEY) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Invalid or missing API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const numeroDocumento = url.searchParams.get("documento");
    const keyword = url.searchParams.get("keyword") || "";
    const fechaDesde = url.searchParams.get("fecha_desde"); // YYYY-MM-DD
    const fechaHasta = url.searchParams.get("fecha_hasta"); // YYYY-MM-DD
    const tipo = url.searchParams.get("tipo"); // content, quiz, game, or empty for all
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);

    if (!numeroDocumento) {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "Parameter 'documento' is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find user by document number
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, institution")
      .eq("numero_documento", numeroDocumento)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "Not Found", message: "No user found with that document number" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = profile.id;
    const offset = (page - 1) * limit;
    const results: any[] = [];

    // Helper to apply date filters
    const applyFilters = (query: any, searchField: string) => {
      if (keyword) {
        query = query.ilike(searchField, `%${keyword}%`);
      }
      if (fechaDesde) {
        query = query.gte("created_at", `${fechaDesde}T00:00:00`);
      }
      if (fechaHasta) {
        query = query.lte("created_at", `${fechaHasta}T23:59:59`);
      }
      return query;
    };

    // Fetch content
    if (!tipo || tipo === "content") {
      let q = supabase
        .from("content")
        .select("id, title, description, content_type, category, grade_level, subject, tags, thumbnail_url, video_url, document_url, is_public, likes_count, views_count, saves_count, shares_count, comments_count, created_at, updated_at", { count: "exact" })
        .eq("creator_id", userId)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      q = applyFilters(q, "title");
      const { data, error, count } = await q.range(offset, offset + limit - 1);
      if (error) throw error;

      results.push(...(data || []).map((item: any) => ({ ...item, type: "content", _total: count })));
    }

    // Fetch quizzes
    if (!tipo || tipo === "quiz") {
      let q = supabase
        .from("quizzes")
        .select("id, title, description, category, grade_level, subject, tags, thumbnail_url, is_public, likes_count, saves_count, shares_count, comments_count, created_at, updated_at", { count: "exact" })
        .eq("creator_id", userId)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      q = applyFilters(q, "title");
      const { data, error, count } = await q.range(offset, offset + limit - 1);
      if (error) throw error;

      results.push(...(data || []).map((item: any) => ({ ...item, type: "quiz", _total: count })));
    }

    // Fetch games
    if (!tipo || tipo === "game") {
      let q = supabase
        .from("games")
        .select("id, title, description, game_type, category, grade_level, subject, tags, thumbnail_url, is_public, likes_count, saves_count, shares_count, comments_count, created_at, updated_at", { count: "exact" })
        .eq("creator_id", userId)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      q = applyFilters(q, "title");
      const { data, error, count } = await q.range(offset, offset + limit - 1);
      if (error) throw error;

      results.push(...(data || []).map((item: any) => ({ ...item, type: "game", _total: count })));
    }

    // Sort combined results by date
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Build response
    const response = {
      success: true,
      user: {
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        institution: profile.institution,
      },
      filters: {
        documento: numeroDocumento,
        keyword: keyword || null,
        fecha_desde: fechaDesde || null,
        fecha_hasta: fechaHasta || null,
        tipo: tipo || "all",
        page,
        limit,
      },
      total_results: results.length,
      data: results.map(({ _total, ...item }) => item),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
