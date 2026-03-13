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
      message.includes("network") ||
      message.includes("timeout")
    );
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

  const uploadWithXhr = (uploadUrl: string, formData: FormData): Promise<CloudinaryUploadResponse> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadUrl, true);
      xhr.timeout = 1000 * 60 * 8; // 8 minutos

      xhr.onload = () => {
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          bodyText: xhr.responseText || "",
        });
      };

      xhr.onerror = () => reject(new Error("Network request failed during upload"));
      xhr.ontimeout = () => reject(new Error("Upload timeout"));

      xhr.send(formData);
    });

  const postToCloudinary = async (uploadUrl: string, buildFormData: () => FormData): Promise<CloudinaryUploadResponse> => {
    try {
      return await uploadWithFetch(uploadUrl, buildFormData());
    } catch (fetchError) {
      if (!isNetworkUploadError(fetchError)) throw fetchError;
      console.warn(`[Cloudinary] Fetch falló en ${uploadUrl}, reintentando con XHR...`, fetchError);
      return uploadWithXhr(uploadUrl, buildFormData());
    }
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

  const getUploadUrls = (uploadUrl: string): string[] => {
    const autoUrl = uploadUrl.replace("/video/upload", "/auto/upload");
    return autoUrl === uploadUrl ? [uploadUrl] : [uploadUrl, autoUrl];
  };

  // Upload video directly to Cloudinary using signed params from edge function
  const uploadToCloudinary = async (file: File): Promise<{ url: string; thumbnail_url: string }> => {
    console.log(`[Cloudinary] Solicitando parámetros de carga para: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Step 1: Get signed upload params from edge function (lightweight call)
    const { data: signData, error: signError } = await supabase.functions.invoke("upload-to-cloudinary", {
      body: {},
    });

    if (signError || signData?.error) {
      const msg = signError?.message || signData?.error || "Error al obtener parámetros de carga";
      console.error("[Cloudinary] Error obteniendo params:", msg);
      throw new Error(msg);
    }

    const { uploadUrl, folder, apiKey, timestamp, signature, uploadPreset } = signData;
    const uploadUrls = getUploadUrls(uploadUrl);

    const buildSignedFormData = () => {
      const signedFormData = new FormData();
      signedFormData.append("file", file);
      signedFormData.append("api_key", apiKey);
      signedFormData.append("timestamp", String(timestamp));
      signedFormData.append("signature", signature);
      signedFormData.append("folder", folder);
      if (uploadPreset) signedFormData.append("upload_preset", uploadPreset);
      return signedFormData;
    };

    const buildUnsignedFormData = () => {
      const unsignedFormData = new FormData();
      unsignedFormData.append("file", file);
      unsignedFormData.append("upload_preset", uploadPreset);
      unsignedFormData.append("folder", folder);
      return unsignedFormData;
    };

    console.log("[Cloudinary] Subiendo video directamente a Cloudinary (signed)...");

    let signedResponse: CloudinaryUploadResponse | null = null;
    let lastSignedError: unknown = null;

    for (const url of uploadUrls) {
      try {
        signedResponse = await postToCloudinary(url, buildSignedFormData);
        break;
      } catch (error) {
        lastSignedError = error;
        if (!isNetworkUploadError(error)) throw error;
      }
    }

    if (!signedResponse) {
      if (uploadPreset) {
        console.warn("[Cloudinary] Signed upload con error de red. Reintentando como unsigned...");

        for (const url of uploadUrls) {
          try {
            const unsignedResponse = await postToCloudinary(url, buildUnsignedFormData);
            if (!unsignedResponse.ok) {
              const unsignedError = parseCloudinaryError(unsignedResponse.bodyText);
              throw new Error(`Error al subir video: ${unsignedResponse.status} - ${unsignedError}`);
            }
            return parseSuccessResponse(unsignedResponse.bodyText);
          } catch (error) {
            lastSignedError = error;
            if (!isNetworkUploadError(error)) throw error;
          }
        }
      }

      const networkMessage =
        lastSignedError instanceof Error
          ? lastSignedError.message
          : "No se pudo conectar durante la carga";

      throw new Error(`Error de red al subir video: ${networkMessage}`);
    }

    if (!signedResponse.ok) {
      const signedError = parseCloudinaryError(signedResponse.bodyText);
      console.error("[Cloudinary] Signed upload failed:", signedResponse.bodyText);

      const shouldFallbackToUnsigned =
        Boolean(uploadPreset) &&
        (signedResponse.status === 401 ||
          signedResponse.status === 403 ||
          /invalid signature|unsigned|upload preset/i.test(signedError));

      if (shouldFallbackToUnsigned) {
        console.warn("[Cloudinary] Reintentando como unsigned con upload_preset...");

        for (const url of uploadUrls) {
          try {
            const unsignedResponse = await postToCloudinary(url, buildUnsignedFormData);
            if (unsignedResponse.ok) {
              return parseSuccessResponse(unsignedResponse.bodyText);
            }

            const unsignedError = parseCloudinaryError(unsignedResponse.bodyText);
            console.error("[Cloudinary] Unsigned fallback failed:", unsignedResponse.bodyText);

            if (url === uploadUrls[uploadUrls.length - 1]) {
              throw new Error(`Error al subir video: ${unsignedResponse.status} - ${unsignedError}`);
            }
          } catch (error) {
            if (!isNetworkUploadError(error) || url === uploadUrls[uploadUrls.length - 1]) {
              throw error;
            }
          }
        }
      }

      throw new Error(`Error al subir video: ${signedResponse.status} - ${signedError}`);
    }

    const result = parseSuccessResponse(signedResponse.bodyText);
    console.log("[Cloudinary] Video subido exitosamente:", result.url);
    return result;
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
        const result = await uploadToCloudinary(file);
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
      return await uploadToCloudinary(file);
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
