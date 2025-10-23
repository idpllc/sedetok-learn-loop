import { useState, useId } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCloudinary } from "@/hooks/useCloudinary";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  compact?: boolean;
}

export const ImageUpload = ({ value, onChange, label = "Imagen de portada", compact = false }: ImageUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { uploadFile, uploading } = useCloudinary();
  const inputId = useId();

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos de imagen",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen no debe superar 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadFile(file);
      if (url) {
        onChange(url);
        toast({
          title: "Imagen cargada",
          description: "La imagen ha sido cargada exitosamente",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar la imagen",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
    toast({
      title: "Imagen eliminada",
      description: "La imagen ha sido eliminada exitosamente",
    });
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      
      {value ? (
        <div className={`relative rounded-lg overflow-hidden bg-muted ${compact ? 'h-20 w-20' : 'aspect-video'}`}>
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size={compact ? "icon" : "sm"}
              onClick={(e) => handleRemove(e)}
            >
              <X className="w-4 h-4" />
              {!compact && <span className="ml-2">Eliminar</span>}
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative rounded-lg border-2 border-dashed transition-colors ${
            compact ? 'h-20 w-20' : 'aspect-video'
          } ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
        >
          <div 
            className={`absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none ${
              compact ? 'gap-1 p-1' : 'gap-3 p-4'
            }`}
          >
            {isUploading || uploading ? (
              <>
                <Loader2 className={`text-primary animate-spin ${compact ? 'w-5 h-5' : 'w-10 h-10'}`} />
                {!compact && (
                  <p className="text-sm text-muted-foreground">
                    Subiendo imagen...
                  </p>
                )}
              </>
            ) : (
              <>
                <div className={`rounded-full bg-primary/10 flex items-center justify-center ${
                  compact ? 'w-8 h-8' : 'w-12 h-12'
                }`}>
                  <Upload className={`text-primary ${compact ? 'w-4 h-4' : 'w-6 h-6'}`} />
                </div>
                {!compact && (
                  <div>
                    <p className="text-sm font-medium mb-1">
                      Arrastra una imagen aquí o haz clic para seleccionar
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG o WEBP • Máx. 5MB
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          
          <label 
            htmlFor={inputId}
            className="absolute inset-0 cursor-pointer"
          />
          <input
            id={inputId}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            disabled={isUploading || uploading}
          />
        </div>
      )}
    </div>
  );
};
