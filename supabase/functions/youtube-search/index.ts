// YouTube Data API v3 search.
// Returns up to N embeddable videos in Spanish for a given query.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { q, maxResults = 3 } = await req.json();
    if (!q || typeof q !== "string" || !q.trim()) {
      return new Response(JSON.stringify({ error: "q is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("YOUTUBE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "YOUTUBE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const limit = Math.max(1, Math.min(10, Number(maxResults) || 3));

    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("key", apiKey);
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("videoEmbeddable", "true");
    searchUrl.searchParams.set("safeSearch", "strict");
    searchUrl.searchParams.set("relevanceLanguage", "es");
    searchUrl.searchParams.set("maxResults", String(limit));
    searchUrl.searchParams.set("q", q.trim());

    const res = await fetch(searchUrl.toString());
    if (!res.ok) {
      const t = await res.text();
      console.error("YouTube API error", res.status, t);
      return new Response(JSON.stringify({ error: "youtube-api-error", detail: t.slice(0, 300) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const results = (data.items || []).map((item: any) => ({
      id: item.id?.videoId,
      title: item.snippet?.title || "",
      description: item.snippet?.description || "",
      channelTitle: item.snippet?.channelTitle || "",
      thumbnail:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        null,
      publishedAt: item.snippet?.publishedAt || null,
      url: item.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : null,
    })).filter((r: any) => r.id && r.url);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("youtube-search fatal", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
