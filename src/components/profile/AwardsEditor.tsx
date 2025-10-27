import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, Award } from "lucide-react";

interface AwardItem {
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

interface AwardsEditorProps {
  awards: AwardItem[];
  onChange: (awards: AwardItem[]) => void;
}

export const AwardsEditor = ({ awards, onChange }: AwardsEditorProps) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addAward = () => {
    onChange([...awards, {
      title: "",
      issuer: "",
      date: "",
      description: "",
    }]);
    setEditingIndex(awards.length);
  };

  const updateAward = (index: number, field: keyof AwardItem, value: string) => {
    const updated = [...awards];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeAward = (index: number) => {
    onChange(awards.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base flex items-center gap-2">
          <Award className="w-5 h-5" />
          Premios y Reconocimientos
        </Label>
        <Button type="button" size="sm" onClick={addAward}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar Premio
        </Button>
      </div>

      {awards.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No has agregado premios o reconocimientos. Haz clic en "Agregar Premio" para comenzar.
        </p>
      )}

      {awards.map((award, index) => (
        <Card key={index} className="relative">
          <CardContent className="pt-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => removeAward(index)}
            >
              <X className="w-4 h-4" />
            </Button>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`award-title-${index}`}>Título del Premio *</Label>
                <Input
                  id={`award-title-${index}`}
                  value={award.title}
                  onChange={(e) => updateAward(index, "title", e.target.value)}
                  placeholder="Ej: Mejor Estudiante del Año"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`award-issuer-${index}`}>Otorgado Por *</Label>
                  <Input
                    id={`award-issuer-${index}`}
                    value={award.issuer}
                    onChange={(e) => updateAward(index, "issuer", e.target.value)}
                    placeholder="Ej: Universidad Nacional"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`award-date-${index}`}>Fecha *</Label>
                  <Input
                    id={`award-date-${index}`}
                    value={award.date}
                    onChange={(e) => updateAward(index, "date", e.target.value)}
                    placeholder="Ej: Diciembre 2023"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`award-desc-${index}`}>Descripción</Label>
                <Textarea
                  id={`award-desc-${index}`}
                  value={award.description || ""}
                  onChange={(e) => updateAward(index, "description", e.target.value)}
                  placeholder="Describe el logro o reconocimiento..."
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
