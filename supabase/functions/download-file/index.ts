import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  // Expose custom headers so the browser can read them if needed
  "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, X-File-Content-Type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, filename } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Downloading file from: ${url}`);

    // Fetch the file from the URL with browser-like headers
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: url,
      },
    });

    if (!response.ok) {
      console.error(`Fetch failed with status: ${response.status} ${response.statusText}`);
      // If direct fetch fails, return the URL for client-side fallback
      return new Response(
        JSON.stringify({
          fallback: true,
          url,
          message: "Direct download not available, use fallback URL",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileContent = await response.arrayBuffer();
    const originalContentType = response.headers.get("content-type") || "application/octet-stream";
    const finalFilename = filename || url.split("/").pop() || "download";

    console.log(
      `File downloaded successfully: ${finalFilename}, size: ${fileContent.byteLength} bytes, content-type: ${originalContentType}`
    );

    // IMPORTANT:
    // Supabase functions client infers how to parse the response ONLY from Content-Type.
    // If we return application/pdf or image/* it may be parsed as text and get corrupted.
    // So we always return application/octet-stream for binary downloads.
    return new Response(fileContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/octet-stream",
        "X-File-Content-Type": originalContentType,
        "Content-Disposition": `attachment; filename="${finalFilename}"`,
        "Content-Length": fileContent.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error downloading file:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

