import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, ExternalLink } from "lucide-react";
import { TagInput } from "./TagInput";

interface Project {
  name: string;
  description: string;
  role?: string;
  url?: string;
  technologies?: string[];
  date?: string;
}

interface ProjectsEditorProps {
  projects: Project[];
  onChange: (projects: Project[]) => void;
}

export const ProjectsEditor = ({ projects, onChange }: ProjectsEditorProps) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addProject = () => {
    onChange([...projects, {
      name: "",
      description: "",
      role: "",
      url: "",
      technologies: [],
      date: "",
    }]);
    setEditingIndex(projects.length);
  };

  const updateProject = (index: number, field: keyof Project, value: any) => {
    const updated = [...projects];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeProject = (index: number) => {
    onChange(projects.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base">Proyectos</Label>
        <Button type="button" size="sm" onClick={addProject}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar Proyecto
        </Button>
      </div>

      {projects.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No has agregado proyectos. Haz clic en "Agregar Proyecto" para comenzar.
        </p>
      )}

      {projects.map((project, index) => (
        <Card key={index} className="relative">
          <CardContent className="pt-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => removeProject(index)}
            >
              <X className="w-4 h-4" />
            </Button>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`project-name-${index}`}>Nombre del Proyecto *</Label>
                <Input
                  id={`project-name-${index}`}
                  value={project.name}
                  onChange={(e) => updateProject(index, "name", e.target.value)}
                  placeholder="Ej: Sistema de Gestión Escolar"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`project-desc-${index}`}>Descripción *</Label>
                <Textarea
                  id={`project-desc-${index}`}
                  value={project.description}
                  onChange={(e) => updateProject(index, "description", e.target.value)}
                  placeholder="Describe el proyecto, su objetivo y resultados..."
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`project-role-${index}`}>Tu Rol</Label>
                  <Input
                    id={`project-role-${index}`}
                    value={project.role || ""}
                    onChange={(e) => updateProject(index, "role", e.target.value)}
                    placeholder="Ej: Desarrollador Full Stack"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`project-date-${index}`}>Fecha</Label>
                  <Input
                    id={`project-date-${index}`}
                    value={project.date || ""}
                    onChange={(e) => updateProject(index, "date", e.target.value)}
                    placeholder="Ej: Enero 2024 - Marzo 2024"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`project-url-${index}`}>
                  <ExternalLink className="w-4 h-4 inline mr-1" />
                  URL del Proyecto
                </Label>
                <Input
                  id={`project-url-${index}`}
                  type="url"
                  value={project.url || ""}
                  onChange={(e) => updateProject(index, "url", e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Tecnologías Utilizadas</Label>
                <TagInput
                  value={project.technologies || []}
                  onChange={(tags) => updateProject(index, "technologies", tags)}
                  placeholder="Escribe y presiona Enter (Ej: React, Node.js)"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
