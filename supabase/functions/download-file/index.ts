import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, X-File-Content-Type",
};

// Block private/loopback/link-local addresses to prevent SSRF
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "0.0.0.0" || h === "::1" || h === "::") return true;

  // IPv4 literal check
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [parseInt(ipv4[1], 10), parseInt(ipv4[2], 10)];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true; // AWS/GCP/Azure metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
    if (a >= 224) return true; // multicast / reserved
  }

  // IPv6 private/link-local
  if (h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80:")) return true;

  // Block internal-looking hostnames
  if (h.endsWith(".internal") || h.endsWith(".local") || h.endsWith(".localhost")) return true;

  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url, filename } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate URL: only http(s) and not pointing at private networks
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return new Response(JSON.stringify({ error: "Only http(s) URLs are allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isPrivateHost(parsed.hostname)) {
      return new Response(JSON.stringify({ error: "URL host is not allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Downloading file from: ${parsed.toString()}`);

    // Short timeout to mitigate long-running probes
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let response: Response;
    try {
      response = await fetch(parsed.toString(), {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: parsed.origin,
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.error(`Fetch failed: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({
          fallback: true,
          url: parsed.toString(),
          message: "Direct download not available, use fallback URL",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileContent = await response.arrayBuffer();
    const originalContentType = response.headers.get("content-type") || "application/octet-stream";
    const finalFilename = filename || parsed.pathname.split("/").pop() || "download";

    console.log(
      `File downloaded: ${finalFilename}, size: ${fileContent.byteLength} bytes, content-type: ${originalContentType}`
    );

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
    return new Response(JSON.stringify({ error: "Download failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
