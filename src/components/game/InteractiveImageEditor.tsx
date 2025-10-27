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
  const draggingPointRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingPointRef.current || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    updatePoint(draggingPointRef.current, { x: clampedX, y: clampedY });
    isDraggingRef.current = true;
  };

  const endDrag = () => {
    draggingPointRef.current = null;
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 0);
  };

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
    if (isDraggingRef.current) {
      // Ignore click triggered right after dragging
      isDraggingRef.current = false;
      return;
    }
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
    <div className="space-y-6">
      {/* Imagen principal - ancho completo */}
      <div className="space-y-2">
        <Label className="text-lg font-semibold">Imagen del juego</Label>
        {!value.image_url ? (
          <label className="flex items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
            <div className="text-center">
              <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-base font-medium mb-1">
                {uploading ? "Subiendo imagen..." : "Sube la imagen para el juego"}
              </p>
              <p className="text-sm text-muted-foreground">
                Haz clic o arrastra una imagen aquí
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
        ) : (
          <div className="relative group">
            <div
              ref={imageRef}
              className="relative w-full bg-muted rounded-lg overflow-hidden cursor-crosshair border-2 border-border"
              style={{ aspectRatio: aspectRatio || 16 / 9 }}
              onClick={handleImageClick}
              onMouseMove={handleMouseMove}
              onMouseUp={endDrag}
              onMouseLeave={endDrag}
            >
              <img
                src={value.image_url}
                alt="Interactive game"
                className="w-full h-full object-contain"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth && img.naturalHeight) {
                    setAspectRatio(img.naturalWidth / img.naturalHeight);
                  }
                }}
              />
              {value.points.map((point) => (
                <button
                  key={point.id}
                  className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-3 transition-all flex items-center justify-center font-medium text-xs ${
                    selectedPoint === point.id
                      ? "bg-primary text-primary-foreground border-primary-foreground scale-110 z-10 shadow-lg"
                      : "bg-green-500 text-white border-white hover:scale-105 shadow-md"
                  }`}
                  style={{
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedPoint(point.id);
                    draggingPointRef.current = point.id;
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPoint(point.id);
                  }}
                >
                  {value.points.indexOf(point) + 1}
                </button>
              ))}
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              onClick={() => {
                onChange({ image_url: undefined, points: [] });
                setSelectedPoint(null);
              }}
            >
              <X className="w-4 h-4 mr-1" />
              Eliminar imagen
            </Button>
          </div>
        )}
        {value.image_url && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
            Haz clic en la imagen para agregar puntos de interacción
          </p>
        )}
      </div>

      {/* Grid de puntos y editor */}
      {value.image_url && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de puntos */}
          {value.points.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Puntos ({value.points.length})</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newPoint: InteractivePoint = {
                      id: Date.now().toString(),
                      x: 50,
                      y: 50,
                      question: "",
                      feedback: "",
                      lives_cost: 1,
                    };
                    onChange({
                      ...value,
                      points: [...value.points, newPoint],
                    });
                    setSelectedPoint(newPoint.id);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar punto
                </Button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {value.points.map((point, index) => (
                  <div
                    key={point.id}
                    className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                      selectedPoint === point.id
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-muted hover:bg-muted/80 border-2 border-transparent"
                    }`}
                    onClick={() => setSelectedPoint(point.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </span>
                      <span className="text-sm truncate">
                        {point.question || "Sin pregunta"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0 hover:bg-destructive hover:text-destructive-foreground"
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

          {/* Editor de punto */}
          <div className="space-y-4">
            {selectedPointData ? (
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">
                    {value.points.indexOf(selectedPointData) + 1}
                  </span>
                  Editar Punto
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
                      max="5"
                      value={selectedPointData.lives_cost}
                      onChange={(e) =>
                        updatePoint(selectedPointData.id, {
                          lives_cost: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Número de vidas que pierde el jugador si hace clic en el lugar equivocado
                    </p>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      <strong>Posición:</strong> {selectedPointData.x.toFixed(1)}% x{" "}
                      {selectedPointData.y.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center border-dashed border-2">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <Plus className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">Sin punto seleccionado</h3>
                <p className="text-sm text-muted-foreground">
                  {value.points.length > 0
                    ? "Haz clic en un punto de la lista o en la imagen para editarlo"
                    : "Haz clic en la imagen para agregar el primer punto"}
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
