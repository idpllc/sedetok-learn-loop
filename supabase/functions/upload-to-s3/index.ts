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
    const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID');
    const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const AWS_S3_BUCKET = Deno.env.get('AWS_S3_BUCKET');
    const AWS_S3_REGION = Deno.env.get('AWS_S3_REGION');

    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_S3_BUCKET || !AWS_S3_REGION) {
      throw new Error('AWS S3 credentials not configured');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'uploads';

    if (!file) {
      throw new Error('No file provided');
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop() || '';
    const fileName = `${folder}/${timestamp}-${randomString}.${extension}`;

    // Create AWS signature for S3 upload
    const host = `${AWS_S3_BUCKET}.s3.${AWS_S3_REGION}.amazonaws.com`;
    const url = `https://${host}/${fileName}`;
    
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    
    // Determine content type
    const contentType = file.type || 'application/octet-stream';

    // Create canonical request
    const method = 'PUT';
    const canonicalUri = `/${fileName}`;
    const canonicalQuerystring = '';
    
    const payloadHash = await sha256Hex(uint8Array);
    
    const canonicalHeaders = 
      `content-type:${contentType}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    
    const canonicalRequest = 
      `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${AWS_S3_REGION}/s3/aws4_request`;
    const stringToSign = 
      `${algorithm}\n${amzDate}\n${credentialScope}\n${await sha256Hex(new TextEncoder().encode(canonicalRequest))}`;

    // Calculate signature
    const signingKey = await getSignatureKey(AWS_SECRET_ACCESS_KEY, dateStamp, AWS_S3_REGION, 's3');
    const signature = await hmacHex(signingKey, stringToSign);

    // Create authorization header
    const authorizationHeader = 
      `${algorithm} Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Upload to S3
    const s3Response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        'Authorization': authorizationHeader,
      },
      body: uint8Array,
    });

    if (!s3Response.ok) {
      const errorText = await s3Response.text();
      console.error('S3 upload error:', errorText);
      throw new Error(`S3 upload failed: ${s3Response.status}`);
    }

    console.log('File uploaded successfully to S3:', url);

    return new Response(
      JSON.stringify({ 
        success: true, 
        url,
        fileName,
        contentType
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('Upload error:', error);
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

// Helper functions for AWS signature
async function sha256Hex(message: Uint8Array | string): Promise<string> {
  let data: ArrayBuffer;
  if (typeof message === 'string') {
    const encoded = new TextEncoder().encode(message);
    data = encoded.buffer.slice(0) as ArrayBuffer;
  } else {
    // Create a new ArrayBuffer copy to ensure proper typing
    const copy = new Uint8Array(message);
    data = copy.buffer.slice(0) as ArrayBuffer;
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const encoded = new TextEncoder().encode(data);
  return await crypto.subtle.sign('HMAC', cryptoKey, encoded.buffer as ArrayBuffer);
}

async function hmacHex(key: ArrayBuffer, data: string): Promise<string> {
  const result = await hmac(key, data);
  return Array.from(new Uint8Array(result))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getSignatureKey(
  key: string, 
  dateStamp: string, 
  regionName: string, 
  serviceName: string
): Promise<ArrayBuffer> {
  const keyEncoded = new TextEncoder().encode('AWS4' + key);
  const keyBuffer = keyEncoded.buffer.slice(keyEncoded.byteOffset, keyEncoded.byteOffset + keyEncoded.byteLength);
  const kDate = await hmac(keyBuffer, dateStamp);
  const kRegion = await hmac(kDate, regionName);
  const kService = await hmac(kRegion, serviceName);
  const kSigning = await hmac(kService, 'aws4_request');
  return kSigning;
}
