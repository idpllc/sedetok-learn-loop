import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type ResourceType = "image" | "document" | "video" | "raw";

// Backward compatibility alias
export const useCloudinary = () => useS3Upload();

export const useS3Upload = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadFile = async (file: File, resourceType: ResourceType = "document") => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      // Determine folder based on resource type
      const folder = resourceType === "image" ? "images" : 
                     resourceType === "video" ? "videos" : "documents";
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
    } catch (error) {
      console.error("[S3] Error completo en uploadFile:", error);
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

  return { uploadFile, uploading };
};
