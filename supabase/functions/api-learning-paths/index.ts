import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use GET." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const params = url.searchParams;

    // Pagination
    const page = Math.max(1, parseInt(params.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || "20")));
    const offset = (page - 1) * limit;

    // Filters
    const search = params.get("search")?.trim();
    const tags = params.get("tags")?.split(",").map((t) => t.trim()).filter(Boolean);
    const category = params.get("category")?.trim();
    const gradeLevel = params.get("grade_level")?.trim();
    const subject = params.get("subject")?.trim();
    const level = params.get("level")?.trim();
    const language = params.get("language")?.trim();
    const learningType = params.get("tipo_aprendizaje")?.trim();
    const topic = params.get("topic")?.trim();
    const creatorId = params.get("creator_id")?.trim();
    const sortBy = params.get("sort_by") || "created_at";
    const sortOrder = params.get("sort_order") === "asc" ? true : false;
    const includeContent = params.get("include_content") === "true";
    const id = params.get("id")?.trim();

    // Allowed sort fields
    const allowedSortFields = [
      "created_at", "updated_at", "title", "total_xp", "estimated_duration",
    ];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "created_at";

    // Build query — only public & published paths
    let query = supabase
      .from("learning_paths")
      .select(
        `
        id,
        title,
        description,
        objectives,
        category,
        grade_level,
        subject,
        topic,
        level,
        language,
        tipo_aprendizaje,
        tags,
        cover_url,
        thumbnail_url,
        total_xp,
        estimated_duration,
        enforce_order,
        require_quiz_pass,
        allow_collaboration,
        status,
        created_at,
        updated_at,
        creator_id,
        profiles!learning_paths_creator_id_fkey (
          id,
          username,
          full_name,
          avatar_url,
          is_verified
        )
      `,
        { count: "exact" }
      )
      .eq("is_public", true)
      .eq("status", "published");

    // Single path by ID
    if (id) {
      query = query.eq("id", id);
    }

    // Search in title & description
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%,topic.ilike.%${search}%`
      );
    }

    // Tag filter (overlap — matches any tag)
    if (tags && tags.length > 0) {
      query = query.overlaps("tags", tags);
    }

    // Exact filters
    if (category) query = query.eq("category", category);
    if (gradeLevel) query = query.eq("grade_level", gradeLevel);
    if (subject) query = query.eq("subject", subject);
    if (level) query = query.eq("level", level);
    if (language) query = query.eq("language", language);
    if (learningType) query = query.eq("tipo_aprendizaje", learningType);
    if (topic) query = query.ilike("topic", `%${topic}%`);
    if (creatorId) query = query.eq("creator_id", creatorId);

    // Sorting & pagination
    query = query.order(safeSortBy, { ascending: sortOrder });
    query = query.range(offset, offset + limit - 1);

    const { data: paths, error, count } = await query;

    if (error) {
      console.error("Query error:", error);
      return new Response(
        JSON.stringify({ error: "Error fetching learning paths", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Optionally include path content items
    let pathsWithContent = paths;
    if (includeContent && paths && paths.length > 0) {
      const pathIds = paths.map((p: any) => p.id);
      const { data: contentItems, error: contentError } = await supabase
        .from("learning_path_content")
        .select(
          `
          id,
          path_id,
          order_index,
          section_name,
          is_required,
          estimated_time_minutes,
          xp_reward,
          content_id,
          quiz_id,
          game_id,
          content (
            id, title, description, content_type, thumbnail_url, video_url
          ),
          quizzes:quiz_id (
            id, title, description, difficulty, thumbnail_url
          ),
          games:game_id (
            id, title, description, game_type, thumbnail_url
          )
        `
        )
        .in("path_id", pathIds)
        .order("order_index", { ascending: true });

      if (!contentError && contentItems) {
        const contentByPath: Record<string, any[]> = {};
        for (const item of contentItems) {
          if (!contentByPath[item.path_id]) contentByPath[item.path_id] = [];
          contentByPath[item.path_id].push(item);
        }
        pathsWithContent = paths.map((p: any) => ({
          ...p,
          content_items: contentByPath[p.id] || [],
        }));
      }
    }

    const totalPages = count ? Math.ceil(count / limit) : 0;

    return new Response(
      JSON.stringify({
        data: pathsWithContent,
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
