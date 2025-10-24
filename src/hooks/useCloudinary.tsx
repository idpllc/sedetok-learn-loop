import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const useCloudinary = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadFile = async (file: File, resourceType: "image" | "video" | "raw" = "raw") => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("resourceType", resourceType);

      console.log(`Iniciando carga de ${resourceType}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

      const { data, error } = await supabase.functions.invoke('upload-to-cloudinary', {
        body: formData,
      });

      if (error) {
        console.error("Error en edge function:", error);
        throw new Error(error.message || "Error al subir el archivo");
      }

      if (data.error) {
        console.error("Error de Cloudinary:", data.error);
        throw new Error(data.error);
      }

      console.log("Archivo subido exitosamente:", data.url);
      return data.url;
    } catch (error) {
      console.error("Error completo en uploadFile:", error);
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
