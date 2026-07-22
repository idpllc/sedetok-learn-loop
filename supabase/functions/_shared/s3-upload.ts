// Shared helper to upload a binary payload to AWS S3 from a Supabase Edge Function
// using AWS Signature V4. Returns the public URL, or null on failure.

async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const keyBuf = key instanceof Uint8Array ? key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuf as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function hmacHex(key: ArrayBuffer, data: string): Promise<string> {
  const result = await hmac(key, data);
  return Array.from(new Uint8Array(result)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getSigningKey(secret: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kSecret = new TextEncoder().encode("AWS4" + secret);
  const kDate = await hmac(kSecret, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return await hmac(kService, "aws4_request");
}

export interface S3UploadOptions {
  bytes: Uint8Array;
  contentType: string;
  folder: string;
  extension?: string; // e.g. "png", "jpg" (no dot)
}

/**
 * Upload bytes to AWS S3. Requires env vars: AWS_ACCESS_KEY_ID,
 * AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET, AWS_S3_REGION.
 * Returns the public URL, or null if credentials are missing / upload fails.
 */
export async function uploadBytesToS3(opts: S3UploadOptions): Promise<string | null> {
  const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID");
  const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  const AWS_S3_BUCKET = Deno.env.get("AWS_S3_BUCKET");
  const AWS_S3_REGION = Deno.env.get("AWS_S3_REGION");

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_S3_BUCKET || !AWS_S3_REGION) {
    console.error("[s3] Missing AWS credentials");
    return null;
  }

  const timestamp = Date.now();
  const rand = Math.random().toString(36).substring(2, 12);
  const ext = opts.extension || "bin";
  const key = `${opts.folder}/${timestamp}-${rand}.${ext}`;

  const host = `${AWS_S3_BUCKET}.s3.${AWS_S3_REGION}.amazonaws.com`;
  const url = `https://${host}/${key}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.substring(0, 8);

  const payloadHash = await sha256Hex(opts.bytes);
  const canonicalHeaders =
    `content-type:${opts.contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = `PUT\n/${key}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credentialScope = `${dateStamp}/${AWS_S3_REGION}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;
  const signingKey = await getSigningKey(AWS_SECRET_ACCESS_KEY, dateStamp, AWS_S3_REGION, "s3");
  const signature = await hmacHex(signingKey, stringToSign);

  const authorization = `AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": opts.contentType,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        Authorization: authorization,
      },
      body: opts.bytes,
    });
    if (!res.ok) {
      console.error("[s3] Upload failed", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    return url;
  } catch (e) {
    console.error("[s3] Upload error", e);
    return null;
  }
}

/** Decode a base64 string to Uint8Array. */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
