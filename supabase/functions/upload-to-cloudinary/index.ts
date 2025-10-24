const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const uploadPreset = Deno.env.get('CLOUDINARY_UPLOAD_PRESET');

    if (!cloudName || !uploadPreset) {
      console.error('Cloudinary credentials not configured');
      throw new Error('Cloudinary credentials not configured');
    }

    console.log('Procesando solicitud de carga...');
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const resourceType = formData.get('resourceType') as string || 'raw';

    if (!file) {
      console.error('No file provided in request');
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Cargando archivo: ${file.name}, tamaño: ${(file.size / 1024 / 1024).toFixed(2)}MB, tipo: ${resourceType}`);

    // Create form data for Cloudinary
    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', file);
    cloudinaryFormData.append('upload_preset', uploadPreset);
    
    // For large files, add chunk size parameter
    if (file.size > 100 * 1024 * 1024) { // 100MB
      cloudinaryFormData.append('chunk_size', '6000000'); // 6MB chunks
    }

    // Upload to Cloudinary
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    console.log('Iniciando carga a Cloudinary...');
    
    const cloudinaryResponse = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: cloudinaryFormData,
    });

    if (!cloudinaryResponse.ok) {
      const errorData = await cloudinaryResponse.json();
      console.error('Error de Cloudinary:', errorData);
      throw new Error(errorData.error?.message || 'Cloudinary upload failed');
    }

    const data = await cloudinaryResponse.json();
    console.log('Carga exitosa, URL:', data.secure_url);

    return new Response(
      JSON.stringify({ url: data.secure_url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in upload-to-cloudinary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
