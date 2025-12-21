import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CLOUDINARY_CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const CLOUDINARY_UPLOAD_PRESET = Deno.env.get('CLOUDINARY_UPLOAD_PRESET');

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      console.error('[Cloudinary] Missing configuration:', { 
        hasCloudName: !!CLOUDINARY_CLOUD_NAME, 
        hasPreset: !!CLOUDINARY_UPLOAD_PRESET 
      });
      throw new Error('Cloudinary configuration is missing');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const resourceType = formData.get('resourceType') as string || 'video';

    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`[Cloudinary] Uploading ${resourceType}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Create FormData for Cloudinary
    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', file);
    cloudinaryFormData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    cloudinaryFormData.append('folder', 'sedefy/videos');

    // Upload to Cloudinary
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
    
    console.log('[Cloudinary] Uploading to:', uploadUrl);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: cloudinaryFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Cloudinary] Upload failed:', errorText);
      throw new Error(`Cloudinary upload failed: ${errorText}`);
    }

    const result = await response.json();
    
    console.log('[Cloudinary] Upload successful:', result.secure_url);

    return new Response(
      JSON.stringify({ 
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        duration: result.duration,
        thumbnail_url: result.secure_url.replace(/\.[^/.]+$/, ".jpg")
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('[Cloudinary] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
