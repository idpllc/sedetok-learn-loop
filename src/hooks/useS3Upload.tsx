import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type ResourceType = "image" | "document" | "video" | "raw";

// Backward compatibility alias
export const useCloudinary = () => useS3Upload();

export const useS3Upload = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Upload video directly to Cloudinary using signed params from edge function
  const uploadToCloudinary = async (file: File): Promise<{ url: string; thumbnail_url: string }> => {
    console.log(`[Cloudinary] Solicitando parámetros de carga para: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Step 1: Get signed upload params from edge function (lightweight call)
    const { data: signData, error: signError } = await supabase.functions.invoke('upload-to-cloudinary', {
      body: JSON.stringify({}),
    });

    if (signError || signData?.error) {
      const msg = signError?.message || signData?.error || "Error al obtener parámetros de carga";
      console.error("[Cloudinary] Error obteniendo params:", msg);
      throw new Error(msg);
    }

    const { uploadUrl, uploadPreset, folder, apiKey, timestamp, signature } = signData;

    // Step 2: Upload directly from client to Cloudinary (signed, no memory limit)
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);
    formData.append("folder", folder);
    if (uploadPreset) {
      formData.append("upload_preset", uploadPreset);
    }

    console.log(`[Cloudinary] Subiendo video directamente a Cloudinary...`);

    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Cloudinary] Upload failed:", errorText);
      throw new Error(`Error al subir video: ${response.status}`);
    }

    const result = await response.json();
    console.log("[Cloudinary] Video subido exitosamente:", result.secure_url);

    return {
      url: result.secure_url,
      thumbnail_url: result.secure_url.replace(/\.[^/.]+$/, ".jpg"),
    };
  };

  // Upload other files to S3
  const uploadToS3 = async (file: File, resourceType: ResourceType): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    
    const folder = resourceType === "image" ? "images" : "documents";
    formData.append("folder", folder);

    console.log(`[S3] Iniciando carga de ${resourceType}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    const { data, error } = await supabase.functions.invoke('upload-to-s3', {
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
      } else {
        return await uploadToS3(file, resourceType);
      }
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
