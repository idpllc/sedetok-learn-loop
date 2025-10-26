import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { X, Upload, Plus } from "lucide-react";
import { useCloudinary } from "@/hooks/useCloudinary";
import { useToast } from "@/hooks/use-toast";

interface InteractivePoint {
  id: string;
  x: number;
  y: number;
  question: string;
  feedback?: string;
  lives_cost: number;
}

interface InteractiveImageEditorProps {
  value: {
    image_url?: string;
    points: InteractivePoint[];
  };
  onChange: (value: { image_url?: string; points: InteractivePoint[] }) => void;
}

export const InteractiveImageEditor = ({ value, onChange }: InteractiveImageEditorProps) => {
  const { uploadFile, uploading } = useCloudinary();
  const { toast } = useToast();
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadFile(file, "image");
      onChange({ ...value, image_url: url });
      toast({
        title: "Imagen subida",
        description: "La imagen se ha cargado correctamente",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newPoint: InteractivePoint = {
      id: Date.now().toString(),
      x,
      y,
      question: "",
      feedback: "",
      lives_cost: 1,
    };

    onChange({
      ...value,
      points: [...value.points, newPoint],
    });
    setSelectedPoint(newPoint.id);
  };

  const updatePoint = (id: string, updates: Partial<InteractivePoint>) => {
    onChange({
      ...value,
      points: value.points.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    });
  };

  const deletePoint = (id: string) => {
    onChange({
      ...value,
      points: value.points.filter((p) => p.id !== id),
    });
    if (selectedPoint === id) setSelectedPoint(null);
  };

  const selectedPointData = value.points.find((p) => p.id === selectedPoint);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <Label>Imagen del juego</Label>
          {!value.image_url ? (
            <div className="mt-2">
              <label className="flex items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {uploading ? "Subiendo..." : "Haz clic para subir una imagen"}
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          ) : (
            <div className="relative mt-2 group">
              <div
                ref={imageRef}
                className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden cursor-crosshair"
                onClick={handleImageClick}
              >
                <img
                  src={value.image_url}
                  alt="Interactive game"
                  className="w-full h-full object-contain"
                />
                {value.points.map((point) => (
                  <button
                    key={point.id}
                    className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 transition-all ${
                      selectedPoint === point.id
                        ? "bg-primary border-primary scale-125 z-10"
                        : "bg-accent border-accent-foreground hover:scale-110"
                    }`}
                    style={{
                      left: `${point.x}%`,
                      top: `${point.y}%`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPoint(point.id);
                    }}
                  >
                    <span className="text-xs font-bold text-accent-foreground">
                      {value.points.indexOf(point) + 1}
                    </span>
                  </button>
                ))}
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onChange({ ...value, image_url: undefined })}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Haz clic en la imagen para agregar puntos interactivos
          </p>
        </div>

        {value.points.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Puntos ({value.points.length})</h3>
            <div className="space-y-2">
              {value.points.map((point, index) => (
                <div
                  key={point.id}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                    selectedPoint === point.id
                      ? "bg-primary/10 border border-primary"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                  onClick={() => setSelectedPoint(point.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">#{index + 1}</span>
                    <span className="text-sm truncate max-w-[200px]">
                      {point.question || "Sin pregunta"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePoint(point.id);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        {selectedPointData ? (
          <Card className="p-4">
            <h3 className="font-semibold mb-4">
              Editar Punto #{value.points.indexOf(selectedPointData) + 1}
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="question">Pregunta *</Label>
                <Input
                  id="question"
                  value={selectedPointData.question}
                  onChange={(e) =>
                    updatePoint(selectedPointData.id, { question: e.target.value })
                  }
                  placeholder="¿Qué parte es esta?"
                />
              </div>

              <div>
                <Label htmlFor="feedback">Retroalimentación (opcional)</Label>
                <Textarea
                  id="feedback"
                  value={selectedPointData.feedback || ""}
                  onChange={(e) =>
                    updatePoint(selectedPointData.id, { feedback: e.target.value })
                  }
                  placeholder="Información adicional sobre esta respuesta..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="lives">Vidas perdidas por error</Label>
                <Input
                  id="lives"
                  type="number"
                  min="1"
                  value={selectedPointData.lives_cost}
                  onChange={(e) =>
                    updatePoint(selectedPointData.id, {
                      lives_cost: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  Posición: {selectedPointData.x.toFixed(1)}% x{" "}
                  {selectedPointData.y.toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <Plus className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              {value.image_url
                ? "Haz clic en la imagen para agregar puntos o selecciona uno existente para editarlo"
                : "Primero sube una imagen para comenzar"}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};
