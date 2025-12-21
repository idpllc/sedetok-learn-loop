import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type ResourceType = "image" | "document" | "video" | "raw";

// Backward compatibility alias
export const useCloudinary = () => useS3Upload();

export const useS3Upload = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Upload video to Cloudinary
  const uploadToCloudinary = async (file: File): Promise<{ url: string; thumbnail_url: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("resourceType", "video");

    console.log(`[Cloudinary] Iniciando carga de video: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    const { data, error } = await supabase.functions.invoke('upload-to-cloudinary', {
      body: formData,
    });

    if (error) {
      console.error("[Cloudinary] Error en edge function:", error);
      throw new Error(error.message || "Error al subir el video a Cloudinary");
    }

    if (data.error) {
      console.error("[Cloudinary] Error:", data.error);
      throw new Error(data.error);
    }

    console.log("[Cloudinary] Video subido exitosamente:", data.url);
    return { url: data.url, thumbnail_url: data.thumbnail_url };
  };

  // Upload other files to S3
  const uploadToS3 = async (file: File, resourceType: ResourceType): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    
    // Determine folder based on resource type
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
      // Videos go to Cloudinary, everything else goes to S3
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

  // Expose uploadToCloudinary separately for cases where we need both url and thumbnail
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
