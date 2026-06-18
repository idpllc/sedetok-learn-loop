import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type ResourceType = "image" | "document" | "video" | "raw";

type CloudinaryUploadResponse = {
  ok: boolean;
  status: number;
  bodyText: string;
};

// Backward compatibility alias
export const useCloudinary = () => useS3Upload();

export const useS3Upload = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const parseCloudinaryError = (errorText: string): string => {
    try {
      const parsed = JSON.parse(errorText);
      return parsed?.error?.message || parsed?.message || errorText;
    } catch {
      return errorText;
    }
  };

  const isNetworkUploadError = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false;

    const message = error.message.toLowerCase();
    return (
      message.includes("load failed") ||
      message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("network request failed") ||
      message.includes("xhr network error") ||
      message.includes("network") ||
      message.includes("timeout")
    );
  };

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const isMobileDevice = (): boolean => {
    if (typeof navigator === "undefined") return false;
    return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
  };

  const shouldUseChunkedUpload = (file: File): boolean => {
    const chunkThreshold = 20 * 1024 * 1024; // 20MB
    return isMobileDevice() || file.size >= chunkThreshold;
  };

  const uploadWithFetch = async (uploadUrl: string, formData: FormData): Promise<CloudinaryUploadResponse> => {
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    const bodyText = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      bodyText,
    };
  };

  const uploadWithXhr = (
    uploadUrl: string,
    formData: FormData,
    options: { headers?: Record<string, string>; timeoutMs?: number } = {},
  ): Promise<CloudinaryUploadResponse> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadUrl, true);
      xhr.timeout = options.timeoutMs ?? 1000 * 60 * 10; // 10 minutos por defecto

      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }

      xhr.onload = () => {
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          bodyText: xhr.responseText || "",
        });
      };

      xhr.onerror = () => reject(new Error("XHR network error"));
      xhr.ontimeout = () => reject(new Error("Upload timeout"));
      xhr.onabort = () => reject(new Error("Upload aborted"));

      xhr.send(formData);
    });

  const buildFormDataFromFields = (file: Blob, fields: Record<string, string>, filename?: string) => {
    const formData = new FormData();
    if (filename) {
      formData.append("file", file, filename);
    } else {
      formData.append("file", file);
    }

    Object.entries(fields).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });

    return formData;
  };

  const postWithRetries = async (
    uploadUrl: string,
    buildFormData: () => FormData,
    maxRetries = 3,
  ): Promise<CloudinaryUploadResponse> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // On first attempt try fetch, subsequent attempts use XHR (more stable on mobile)
        if (attempt === 1) {
          try {
            return await uploadWithFetch(uploadUrl, buildFormData());
          } catch (fetchErr) {
            if (!isNetworkUploadError(fetchErr)) throw fetchErr;
            console.warn(`[Cloudinary] Fetch falló (intento ${attempt}), probando XHR...`);
            return await uploadWithXhr(uploadUrl, buildFormData());
          }
        }

        console.log(`[Cloudinary] Reintento ${attempt}/${maxRetries} con XHR...`);
        return await uploadWithXhr(uploadUrl, buildFormData());
      } catch (error) {
        lastError = error;
        if (!isNetworkUploadError(error)) throw error;
        if (attempt < maxRetries) {
          const waitMs = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
          console.warn(`[Cloudinary] Intento ${attempt} falló, esperando ${waitMs}ms...`);
          await delay(waitMs);
        }
      }
    }

    throw lastError;
  };

  const uploadChunkWithRetries = async (
    uploadUrl: string,
    buildChunkFormData: () => FormData,
    headers: Record<string, string>,
    maxRetries = 3,
  ): Promise<CloudinaryUploadResponse> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await uploadWithXhr(uploadUrl, buildChunkFormData(), {
          headers,
          timeoutMs: 1000 * 60 * 4,
        });
      } catch (error) {
        lastError = error;
        if (!isNetworkUploadError(error) || attempt >= maxRetries) throw error;

        const waitMs = Math.min(1000 * Math.pow(2, attempt), 8000);
        console.warn(`[Cloudinary] Chunk falló (intento ${attempt}/${maxRetries}), esperando ${waitMs}ms...`);
        await delay(waitMs);
      }
    }

    throw lastError;
  };

  const uploadToCloudinaryInChunks = async (
    uploadUrl: string,
    file: File,
    fields: Record<string, string>,
  ): Promise<CloudinaryUploadResponse> => {
    // Cloudinary requiere chunks >= 5MB (excepto el último).
    // Usamos 10MB para reducir número de peticiones en archivos grandes (ej. 500MB = 50 chunks).
    const chunkSize = 10 * 1024 * 1024; // 10MB
    const totalSize = file.size;
    const totalChunks = Math.ceil(totalSize / chunkSize);
    const uploadId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    console.log(`[Cloudinary] Subida por chunks: ${totalChunks} bloques de ~${(chunkSize / 1024 / 1024).toFixed(0)}MB para archivo de ${(totalSize / 1024 / 1024).toFixed(1)}MB`);

    let start = 0;
    let chunkIndex = 0;
    let lastResponse: CloudinaryUploadResponse | null = null;

    while (start < totalSize) {
      const end = Math.min(start + chunkSize, totalSize);
      const chunk = file.slice(start, end);
      const headers = {
        "X-Unique-Upload-Id": uploadId,
        "Content-Range": `bytes ${start}-${end - 1}/${totalSize}`,
      };

      console.log(`[Cloudinary] Chunk ${chunkIndex + 1}/${totalChunks} (${(start / 1024 / 1024).toFixed(1)}MB - ${(end / 1024 / 1024).toFixed(1)}MB)`);

      const chunkResponse = await uploadChunkWithRetries(
        uploadUrl,
        () => buildFormDataFromFields(chunk, fields, file.name),
        headers,
        5, // 5 reintentos por chunk para archivos grandes
      );
      lastResponse = chunkResponse;

      if (!chunkResponse.ok) {
        console.error(`[Cloudinary] Chunk ${chunkIndex + 1}/${totalChunks} falló: ${chunkResponse.status}`);
        return chunkResponse;
      }

      start = end;
      chunkIndex++;
    }

    console.log(`[Cloudinary] Todos los ${totalChunks} chunks subidos exitosamente`);

    return (
      lastResponse ?? {
        ok: false,
        status: 0,
        bodyText: "No se obtuvo respuesta de carga por chunks",
      }
    );
  };

  const uploadWithResilience = async (
    uploadUrl: string,
    file: File,
    fields: Record<string, string>,
  ): Promise<CloudinaryUploadResponse> => {
    if (shouldUseChunkedUpload(file)) {
      console.log("[Cloudinary] Usando subida por chunks para mayor estabilidad móvil...");
      return uploadToCloudinaryInChunks(uploadUrl, file, fields);
    }

    return postWithRetries(uploadUrl, () => buildFormDataFromFields(file, fields), 3);
  };

  const parseSuccessResponse = (bodyText: string): { url: string; thumbnail_url: string } => {
    try {
      const result = JSON.parse(bodyText);
      if (!result?.secure_url) throw new Error("Cloudinary no devolvió secure_url");

      return {
        url: result.secure_url,
        thumbnail_url: result.secure_url.replace(/\.[^/.]+$/, ".jpg"),
      };
    } catch {
      throw new Error("Cloudinary devolvió una respuesta inválida");
    }
  };

  // Upload video directly to S3 using a presigned PUT URL
  const putWithXhr = (
    uploadUrl: string,
    file: Blob,
    contentType: string,
    timeoutMs = 1000 * 60 * 30,
  ): Promise<{ ok: boolean; status: number; bodyText: string }> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.timeout = timeoutMs;
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.onload = () =>
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          bodyText: xhr.responseText || "",
        });
      xhr.onerror = () => reject(new Error("XHR network error"));
      xhr.ontimeout = () => reject(new Error("Upload timeout"));
      xhr.onabort = () => reject(new Error("Upload aborted"));
      xhr.send(file);
    });

  const uploadVideoToS3 = async (file: File): Promise<{ url: string; thumbnail_url: string }> => {
    console.log(`[S3] Solicitando URL presignada para video: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    const { data, error } = await supabase.functions.invoke("s3-presign-upload", {
      body: {
        fileName: file.name,
        contentType: file.type || "video/mp4",
        folder: "videos",
      },
    });

    if (error || data?.error) {
      const msg = error?.message || data?.error || "No se pudo obtener URL de carga";
      console.error("[S3] Error presign:", msg);
      throw new Error(msg);
    }

    const { uploadUrl, publicUrl, contentType } = data as {
      uploadUrl: string;
      publicUrl: string;
      contentType: string;
    };

    console.log("[S3] Subiendo video directamente a S3...");

    const maxRetries = 3;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await putWithXhr(uploadUrl, file, contentType);
        if (res.ok) {
          console.log("[S3] Video subido exitosamente:", publicUrl);
          return { url: publicUrl, thumbnail_url: publicUrl };
        }
        if (res.status >= 400 && res.status < 500) {
          throw new Error(`Error S3 ${res.status}: ${res.bodyText.slice(0, 200)}`);
        }
        lastError = new Error(`Error S3 ${res.status}: ${res.bodyText.slice(0, 200)}`);
      } catch (err) {
        lastError = err;
        if (!isNetworkUploadError(err) || attempt >= maxRetries) throw err;
        const waitMs = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
        console.warn(`[S3] Intento ${attempt} falló, esperando ${waitMs}ms...`);
        await delay(waitMs);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("No se pudo subir el video");
  };

  // Upload other files to S3
  const uploadToS3 = async (file: File, resourceType: ResourceType): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const folder = resourceType === "image" ? "images" : "documents";
    formData.append("folder", folder);

    console.log(`[S3] Iniciando carga de ${resourceType}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    const { data, error } = await supabase.functions.invoke("upload-to-s3", {
      body: formData,
    });

    if (error) {
      console.error("[S3] Error en edge function:", error);
      throw new Error(error.message || "Error al subir el archivo a S3");
    }

    if (data.error) {
      console.error("[S3] Error de S3:", data.error);
      throw new Error(data.error);
    }

    console.log("[S3] Archivo subido exitosamente:", data.url);
    return data.url;
  };

  const uploadFile = async (file: File, resourceType: ResourceType = "document"): Promise<string> => {
    setUploading(true);
    try {
      if (resourceType === "video") {
        const result = await uploadVideoToS3(file);
        return result.url;
      }

      return await uploadToS3(file, resourceType);
    } catch (error) {
      console.error("[Upload] Error completo en uploadFile:", error);
      const errorMessage = error instanceof Error ? error.message : "No se pudo subir el archivo";
      toast({
        title: "Error al subir archivo",
        description: errorMessage.includes("timeout")
          ? "El archivo es muy grande y la carga tomó demasiado tiempo. Por favor intenta con un archivo más pequeño o con mejor conexión."
          : errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const uploadVideo = async (file: File): Promise<{ url: string; thumbnail_url: string }> => {
    setUploading(true);
    try {
      return await uploadVideoToS3(file);
    } catch (error) {
      console.error("[Upload] Error en uploadVideo:", error);
      const errorMessage = error instanceof Error ? error.message : "No se pudo subir el video";
      toast({
        title: "Error al subir video",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploadVideo, uploading };
};
