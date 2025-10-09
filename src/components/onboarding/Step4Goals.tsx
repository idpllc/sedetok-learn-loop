import { useState } from "react";
import { Target, Calendar, TrendingUp } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Step4Props {
  formData: any;
  updateFormData: (data: any) => void;
}

export const Step4Goals = ({ formData, updateFormData }: Step4Props) => {
  const [skillInput, setSkillInput] = useState("");

  const metaLevels = [
    { value: "Inicial", icon: "🌱", desc: "Estoy empezando mi camino" },
    { value: "Intermedio", icon: "🌿", desc: "Tengo conocimientos básicos" },
    { value: "Avanzado", icon: "🌳", desc: "Busco profundizar mis conocimientos" },
  ];

  const frequencies = [
    { value: "Diaria", icon: Calendar, label: "Diaria", desc: "Todos los días" },
    { value: "Semanal", icon: Calendar, label: "Semanal", desc: "Varias veces por semana" },
    { value: "Esporádica", icon: Calendar, label: "Esporádica", desc: "Cuando pueda" },
  ];

  const skillTags = formData.habilidades_a_desarrollar
    ? formData.habilidades_a_desarrollar.split(",").map((t: string) => t.trim()).filter(Boolean)
    : [];

  const addSkill = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      const newSkills = [...skillTags, skillInput.trim()];
      updateFormData({ habilidades_a_desarrollar: newSkills.join(", ") });
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    const newSkills = skillTags.filter((s: string) => s !== skill);
    updateFormData({ habilidades_a_desarrollar: newSkills.join(", ") });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2">Define tus objetivos</h3>
        <p className="text-muted-foreground">Establece tus metas de aprendizaje</p>
      </div>

      <div className="space-y-4">
        <Label className="text-base flex items-center gap-2">
          <Target className="w-4 h-4" />
          Nivel de meta de aprendizaje
        </Label>
        <div className="grid gap-3">
          {metaLevels.map((level) => {
            const isSelected = formData.nivel_meta_aprendizaje === level.value;
            
            return (
              <Card
                key={level.value}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => updateFormData({ nivel_meta_aprendizaje: level.value })}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{level.icon}</div>
                  <div className="flex-1">
                    <p className="font-semibold">{level.value}</p>
                    <p className="text-sm text-muted-foreground">{level.desc}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                  }`} />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Habilidades que quieres desarrollar
        </Label>
        <Input
          placeholder="Escribe y presiona Enter (ej: pensamiento crítico, programación)"
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={addSkill}
        />
        <div className="flex flex-wrap gap-2 min-h-[40px]">
          {skillTags.map((skill: string) => (
            <Badge key={skill} variant="secondary" className="cursor-pointer" onClick={() => removeSkill(skill)}>
              {skill} ×
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-base">Frecuencia de estudio</Label>
        <div className="grid gap-3">
          {frequencies.map((freq) => {
            const Icon = freq.icon;
            const isSelected = formData.frecuencia_estudio === freq.value;
            
            return (
              <Card
                key={freq.value}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => updateFormData({ frecuencia_estudio: freq.value })}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="flex-1">
                    <p className="font-semibold">{freq.label}</p>
                    <p className="text-sm text-muted-foreground">{freq.desc}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                  }`} />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
