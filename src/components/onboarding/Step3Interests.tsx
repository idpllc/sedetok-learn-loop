import { useState } from "react";
import { Calculator, Palette, Microscope, Laptop, Globe, Music, Heart, BookOpen } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Step3Props {
  formData: any;
  updateFormData: (data: any) => void;
}

export const Step3Interests = ({ formData, updateFormData }: Step3Props) => {
  const [tagInput, setTagInput] = useState("");

  const areas = [
    { value: "Matemáticas", icon: Calculator },
    { value: "Arte", icon: Palette },
    { value: "Ciencias", icon: Microscope },
    { value: "Tecnología", icon: Laptop },
    { value: "Idiomas", icon: Globe },
    { value: "Música", icon: Music },
    { value: "Deportes", icon: Heart },
    { value: "Literatura", icon: BookOpen },
  ];

  const motivations = [
    { value: "Aprender", label: "Aprender cosas nuevas" },
    { value: "Certificarme", label: "Obtener certificados" },
    { value: "Superarme", label: "Superarme personalmente" },
    { value: "Jugar", label: "Divertirme aprendiendo" },
    { value: "Competir", label: "Competir con otros" },
  ];

  const selectedAreas = formData.areas_interes || [];
  const professionTags = formData.profesiones_de_interes
    ? formData.profesiones_de_interes.split(",").map((t: string) => t.trim()).filter(Boolean)
    : [];

  const toggleArea = (area: string) => {
    const current = [...selectedAreas];
    const index = current.indexOf(area);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(area);
    }
    updateFormData({ areas_interes: current });
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTags = [...professionTags, tagInput.trim()];
      updateFormData({ profesiones_de_interes: newTags.join(", ") });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    const newTags = professionTags.filter((t: string) => t !== tag);
    updateFormData({ profesiones_de_interes: newTags.join(", ") });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2">¿Qué te apasiona?</h3>
        <p className="text-muted-foreground">Cuéntanos sobre tus intereses académicos</p>
      </div>

      <div className="space-y-4">
        <Label className="text-base">Áreas de interés (selecciona varias)</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {areas.map((area) => {
            const Icon = area.icon;
            const isSelected = selectedAreas.includes(area.value);
            
            return (
              <Card
                key={area.value}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => toggleArea(area.value)}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <Icon className={`w-6 h-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-sm font-medium">{area.value}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <Label htmlFor="professions" className="text-base">Profesiones o temas de interés</Label>
        <Input
          id="professions"
          placeholder="Escribe y presiona Enter para agregar"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={addTag}
        />
        <div className="flex flex-wrap gap-2 min-h-[40px]">
          {professionTags.map((tag: string) => (
            <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
              {tag} ×
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-base">Motivaciones principales</Label>
        <div className="space-y-2">
          {motivations.map((motivation) => {
            const isSelected = formData.motivaciones_principales === motivation.value;
            
            return (
              <Card
                key={motivation.value}
                className={`p-3 cursor-pointer transition-all hover:shadow-sm ${
                  isSelected ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => updateFormData({ motivaciones_principales: motivation.value })}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                  }`} />
                  <p className="font-medium">{motivation.label}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
