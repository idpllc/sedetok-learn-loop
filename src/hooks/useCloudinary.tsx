import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const useCloudinary = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadFile = async (file: File, resourceType: "video" | "raw" = "raw") => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "ml_default");

      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Error al subir el archivo");
      }

      const data = await response.json();
      return data.secure_url;
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
