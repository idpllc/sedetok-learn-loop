import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const uploadPreset = Deno.env.get('NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET') || 'sede_uploads';
    
    console.log('Cloud Name:', cloudName);
    console.log('Upload Preset:', uploadPreset);
    
    if (!cloudName) {
      throw new Error('CLOUDINARY_CLOUD_NAME no está configurado');
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const resourceType = formData.get('resourceType') || 'raw';

    console.log('Resource Type:', resourceType);
    console.log('File received:', !!file);

    if (!file) {
      throw new Error('No se proporcionó ningún archivo');
    }

    // Crear FormData para Cloudinary
    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', file);
    cloudinaryFormData.append('upload_preset', uploadPreset);

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    
    const response = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: cloudinaryFormData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error al subir a Cloudinary');
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ url: data.secure_url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
