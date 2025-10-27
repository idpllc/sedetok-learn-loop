import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Brain, Plus, Trash2, Code, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Skill {
  name: string;
  level: number;
  type: "technical" | "soft";
}

interface SkillsEditorProps {
  skills: Skill[];
  onChange: (skills: Skill[]) => void;
  onSave?: (skills: Skill[]) => void;
}

export const SkillsEditor = ({ skills, onChange, onSave }: SkillsEditorProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Skill>({
    name: "",
    level: 50,
    type: "technical",
  });

const handleAdd = () => {
  if (!formData.name) return;
  const updatedSkills = [...skills, formData];
  onChange(updatedSkills);
  setFormData({ name: "", level: 50, type: "technical" });
  setOpen(false);
  
  onSave?.(updatedSkills);
};

  const handleDelete = (index: number) => {
    onChange(skills.filter((_, i) => i !== index));
  };

  const technicalSkills = skills.filter(s => s.type === "technical");
  const softSkills = skills.filter(s => s.type === "soft");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Habilidades
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Habilidad</DialogTitle>
                <DialogDescription>
                  Define tus habilidades técnicas y blandas
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="skill_name">Nombre de la Habilidad *</Label>
                  <Input
                    id="skill_name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: React, Liderazgo, Comunicación"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skill_type">Tipo</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => setFormData({ ...formData, type: value as "technical" | "soft" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Habilidad Técnica</SelectItem>
                      <SelectItem value="soft">Habilidad Blanda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skill_level">Nivel: {formData.level}%</Label>
                  <Slider
                    id="skill_level"
                    value={[formData.level]}
                    onValueChange={([value]) => setFormData({ ...formData, level: value })}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAdd} disabled={!formData.name}>
                  Agregar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {skills.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No has agregado habilidades aún
          </p>
        ) : (
          <>
            {/* Habilidades Técnicas */}
            {technicalSkills.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Técnicas
                </h4>
                {technicalSkills.map((skill, index) => {
                  const actualIndex = skills.findIndex(s => s === skill);
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{skill.name}</span>
                          <span className="text-xs text-muted-foreground">{skill.level}%</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${skill.level}%` }}
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(actualIndex)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Habilidades Blandas */}
            {softSkills.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Blandas
                </h4>
                {softSkills.map((skill, index) => {
                  const actualIndex = skills.findIndex(s => s === skill);
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{skill.name}</span>
                          <span className="text-xs text-muted-foreground">{skill.level}%</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-accent transition-all"
                            style={{ width: `${skill.level}%` }}
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(actualIndex)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};