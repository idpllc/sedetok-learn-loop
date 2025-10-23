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

      const { data, error } = await supabase.functions.invoke('upload-to-cloudinary', {
        body: formData,
      });

      if (error) {
        throw new Error(error.message || "Error al subir el archivo");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data.url;
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo subir el archivo",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading };
};
