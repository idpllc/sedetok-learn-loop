import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CLOUDINARY_CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME')?.trim();
    const CLOUDINARY_API_KEY = Deno.env.get('CLOUDINARY_API_KEY')?.trim();
    const CLOUDINARY_API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET')?.trim();
    const CLOUDINARY_UPLOAD_PRESET =
      Deno.env.get('CLOUDINARY_UPLOAD_PRESET')?.trim() ||
      Deno.env.get('NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET')?.trim() ||
      undefined;

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      console.error('[Cloudinary] Missing env vars:', {
        hasCloudName: !!CLOUDINARY_CLOUD_NAME,
        hasApiKey: !!CLOUDINARY_API_KEY,
        hasApiSecret: !!CLOUDINARY_API_SECRET,
      });
      throw new Error('Cloudinary configuration is missing');
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'sedefy/videos';

    // Signed upload: params in alphabetical order + api_secret appended
    const params: Record<string, string | number> = {
      folder,
      timestamp,
    };

    if (CLOUDINARY_UPLOAD_PRESET) {
      params.upload_preset = CLOUDINARY_UPLOAD_PRESET;
    }

    const paramsToSign = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    const encoder = new TextEncoder();
    const data = encoder.encode(paramsToSign + CLOUDINARY_API_SECRET);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('[Cloudinary] Generated signed upload params', { hasPreset: !!CLOUDINARY_UPLOAD_PRESET });

    return new Response(
      JSON.stringify({
        cloudName: CLOUDINARY_CLOUD_NAME,
        apiKey: CLOUDINARY_API_KEY,
        folder,
        timestamp,
        signature,
        uploadPreset: CLOUDINARY_UPLOAD_PRESET ?? null,
        uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Cloudinary] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
