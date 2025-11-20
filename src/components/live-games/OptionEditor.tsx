import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, X } from "lucide-react";
import { useCloudinary } from "@/hooks/useCloudinary";
import { useToast } from "@/hooks/use-toast";
import { useRef } from "react";

interface OptionEditorProps {
  option: { text: string; image_url?: string };
  index: number;
  onTextChange: (value: string) => void;
  onImageChange: (value: string) => void;
}

export const OptionEditor = ({ option, index, onTextChange, onImageChange }: OptionEditorProps) => {
  const { uploadFile, uploading } = useCloudinary();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast({
        title: "Subiendo imagen...",
        description: "Por favor espera",
      });
      const url = await uploadFile(file, "image");
      onImageChange(url);
      toast({
        title: "Imagen agregada",
        description: "La imagen se ha subido exitosamente",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-start">
        <Input
          value={option.text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={`Opción ${index + 1}`}
          className="flex-1"
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <ImageIcon className="w-4 h-4" />
        </Button>
      </div>
      {option.image_url && (
        <div className="relative w-full h-24 rounded-lg overflow-hidden border">
          <img
            src={option.image_url}
            alt={`Opción ${index + 1}`}
            className="w-full h-full object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={() => onImageChange("")}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
