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
    const CLOUDINARY_CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const CLOUDINARY_API_KEY = Deno.env.get('CLOUDINARY_API_KEY');
    const CLOUDINARY_API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET');

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
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(paramsToSign + CLOUDINARY_API_SECRET);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('[Cloudinary] Generated signed upload params');

    return new Response(
      JSON.stringify({
        cloudName: CLOUDINARY_CLOUD_NAME,
        apiKey: CLOUDINARY_API_KEY,
        folder,
        timestamp,
        signature,
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
