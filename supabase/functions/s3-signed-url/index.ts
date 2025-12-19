import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID");
    const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY");
    const AWS_S3_REGION = Deno.env.get("AWS_S3_REGION");

    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_S3_REGION) {
      throw new Error("AWS S3 credentials not configured");
    }

    const { url, expiresInSeconds } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expires =
      typeof expiresInSeconds === "number" && expiresInSeconds > 0
        ? Math.min(expiresInSeconds, 60 * 60 * 6) // cap at 6h
        : 60 * 30; // default 30m

    const parsed = new URL(url);

    // Supports virtual-hosted-style: https://bucket.s3.region.amazonaws.com/key
    const hostParts = parsed.hostname.split(".");
    const isS3 = hostParts.length >= 5 && hostParts[1] === "s3" && hostParts[hostParts.length - 2] === "amazonaws";

    if (!isS3) {
      return new Response(JSON.stringify({ error: "Not an S3 URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const canonicalUri = encodeRfc3986(decodeURIComponent(parsed.pathname));

    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substring(0, 8);
    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${AWS_S3_REGION}/s3/aws4_request`;

    // Build query params for presign
    const params = new URLSearchParams(parsed.search);
    params.set("X-Amz-Algorithm", algorithm);
    params.set("X-Amz-Credential", `${AWS_ACCESS_KEY_ID}/${credentialScope}`);
    params.set("X-Amz-Date", amzDate);
    params.set("X-Amz-Expires", String(expires));
    params.set("X-Amz-SignedHeaders", "host");

    // Canonical query string: sort by key then value
    const sorted = Array.from(params.entries()).sort(([aK, aV], [bK, bV]) =>
      aK === bK ? aV.localeCompare(bV) : aK.localeCompare(bK)
    );
    const canonicalQuerystring = sorted
      .map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`)
      .join("&");

    const canonicalHeaders = `host:${parsed.hostname}\n`;
    const signedHeaders = "host";
    const payloadHash = "UNSIGNED-PAYLOAD";

    const canonicalRequest = `GET\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${await sha256Hex(new TextEncoder().encode(canonicalRequest))}`;

    const signingKey = await getSignatureKey(
      AWS_SECRET_ACCESS_KEY,
      dateStamp,
      AWS_S3_REGION,
      "s3"
    );
    const signature = await hmacHex(signingKey, stringToSign);

    const signedUrl = `${parsed.origin}${parsed.pathname}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;

    return new Response(JSON.stringify({ url: signedUrl, expiresInSeconds: expires }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("s3-signed-url error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function encodeRfc3986(str: string) {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

async function sha256Hex(message: Uint8Array | string): Promise<string> {
  let data: ArrayBuffer;
  if (typeof message === "string") {
    const encoded = new TextEncoder().encode(message);
    data = encoded.buffer.slice(0) as ArrayBuffer;
  } else {
    const copy = new Uint8Array(message);
    data = copy.buffer.slice(0) as ArrayBuffer;
  }
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const encoded = new TextEncoder().encode(data);
  return await crypto.subtle.sign("HMAC", cryptoKey, encoded.buffer as ArrayBuffer);
}

async function hmacHex(key: ArrayBuffer, data: string): Promise<string> {
  const result = await hmac(key, data);
  return Array.from(new Uint8Array(result))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Promise<ArrayBuffer> {
  const keyEncoded = new TextEncoder().encode("AWS4" + key);
  const keyBuffer = keyEncoded.buffer.slice(
    keyEncoded.byteOffset,
    keyEncoded.byteOffset + keyEncoded.byteLength
  );
  const kDate = await hmac(keyBuffer, dateStamp);
  const kRegion = await hmac(kDate, regionName);
  const kService = await hmac(kRegion, serviceName);
  const kSigning = await hmac(kService, "aws4_request");
  return kSigning;
}
