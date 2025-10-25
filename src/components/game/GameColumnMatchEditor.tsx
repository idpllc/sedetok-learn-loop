import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { useState } from "react";
import { useCloudinary } from "@/hooks/useCloudinary";
import { toast } from "sonner";

interface ColumnItem {
  id: string;
  text: string;
  image_url?: string;
  match_id: string;
}

interface GameColumnMatchEditorProps {
  leftItems: ColumnItem[];
  rightItems: ColumnItem[];
  onChange: (leftItems: ColumnItem[], rightItems: ColumnItem[]) => void;
}

const MAX_TEXT_LENGTH = 50;

export const GameColumnMatchEditor = ({
  leftItems,
  rightItems,
  onChange,
}: GameColumnMatchEditorProps) => {
  const { uploadFile, uploading } = useCloudinary();
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);

  const addLeftItem = () => {
    const newId = `left-${Date.now()}`;
    const matchId = `match-${Date.now()}`;
    onChange(
      [...leftItems, { id: newId, text: "", match_id: matchId }],
      rightItems
    );
  };

  const addRightItem = () => {
    const newId = `right-${Date.now()}`;
    const matchId = leftItems.length > rightItems.length 
      ? leftItems[rightItems.length].match_id 
      : `match-${Date.now()}`;
    onChange(
      leftItems,
      [...rightItems, { id: newId, text: "", match_id: matchId }]
    );
  };

  const updateLeftItem = (index: number, updates: Partial<ColumnItem>) => {
    const newItems = [...leftItems];
    newItems[index] = { ...newItems[index], ...updates };
    onChange(newItems, rightItems);
  };

  const updateRightItem = (index: number, updates: Partial<ColumnItem>) => {
    const newItems = [...rightItems];
    newItems[index] = { ...newItems[index], ...updates };
    onChange(leftItems, newItems);
  };

  const deleteLeftItem = (index: number) => {
    const newItems = leftItems.filter((_, i) => i !== index);
    onChange(newItems, rightItems);
  };

  const deleteRightItem = (index: number) => {
    const newItems = rightItems.filter((_, i) => i !== index);
    onChange(leftItems, newItems);
  };

  const handleImageUpload = async (
    file: File,
    side: "left" | "right",
    index: number
  ) => {
    try {
      setUploadingItem(`${side}-${index}`);
      const url = await uploadFile(file, "image");
      if (side === "left") {
        updateLeftItem(index, { image_url: url });
      } else {
        updateRightItem(index, { image_url: url });
      }
      toast.success("Imagen subida exitosamente");
    } catch (error) {
      toast.error("Error al subir la imagen");
    } finally {
      setUploadingItem(null);
    }
  };

  const removeImage = (side: "left" | "right", index: number) => {
    if (side === "left") {
      updateLeftItem(index, { image_url: undefined });
    } else {
      updateRightItem(index, { image_url: undefined });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-accent/50 p-4 rounded-lg">
        <p className="text-sm text-muted-foreground">
          Crea pares de items para conectar. Máximo {MAX_TEXT_LENGTH} caracteres por texto.
          Puedes agregar imágenes opcionales a cada item.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold">Columna Izquierda</Label>
            <Button onClick={addLeftItem} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </div>

          <div className="space-y-3">
            {leftItems.map((item, index) => (
              <Card key={item.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Input
                      value={item.text}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, MAX_TEXT_LENGTH);
                        updateLeftItem(index, { text: value });
                      }}
                      placeholder={`Texto ${index + 1}`}
                      maxLength={MAX_TEXT_LENGTH}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.text.length}/{MAX_TEXT_LENGTH}
                    </p>
                  </div>
                  <Button
                    onClick={() => deleteLeftItem(index)}
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {item.image_url ? (
                  <div className="relative">
                    <img
                      src={item.image_url}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded"
                    />
                    <Button
                      onClick={() => removeImage("left", index)}
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, "left", index);
                      }}
                      className="hidden"
                      id={`left-upload-${index}`}
                      disabled={uploading && uploadingItem === `left-${index}`}
                    />
                    <label htmlFor={`left-upload-${index}`}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={uploading && uploadingItem === `left-${index}`}
                        asChild
                      >
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          {uploading && uploadingItem === `left-${index}`
                            ? "Subiendo..."
                            : "Agregar imagen"}
                        </span>
                      </Button>
                    </label>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Par #{index + 1}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold">Columna Derecha</Label>
            <Button onClick={addRightItem} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </div>

          <div className="space-y-3">
            {rightItems.map((item, index) => (
              <Card key={item.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Input
                      value={item.text}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, MAX_TEXT_LENGTH);
                        updateRightItem(index, { text: value });
                      }}
                      placeholder={`Texto ${index + 1}`}
                      maxLength={MAX_TEXT_LENGTH}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.text.length}/{MAX_TEXT_LENGTH}
                    </p>
                  </div>
                  <Button
                    onClick={() => deleteRightItem(index)}
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {item.image_url ? (
                  <div className="relative">
                    <img
                      src={item.image_url}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded"
                    />
                    <Button
                      onClick={() => removeImage("right", index)}
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, "right", index);
                      }}
                      className="hidden"
                      id={`right-upload-${index}`}
                      disabled={uploading && uploadingItem === `right-${index}`}
                    />
                    <label htmlFor={`right-upload-${index}`}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={uploading && uploadingItem === `right-${index}`}
                        asChild
                      >
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          {uploading && uploadingItem === `right-${index}`
                            ? "Subiendo..."
                            : "Agregar imagen"}
                        </span>
                      </Button>
                    </label>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Par #{index + 1}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
