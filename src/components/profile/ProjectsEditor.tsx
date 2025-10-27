import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, FolderGit2, ExternalLink } from "lucide-react";
import { TagInput } from "./TagInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  onSave?: (projects: Project[]) => void;
}

export const ProjectsEditor = ({ projects, onChange, onSave }: ProjectsEditorProps) => {
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Project>({
    name: "",
    description: "",
    role: "",
    url: "",
    technologies: [],
    date: "",
  });

  const handleAdd = () => {
    setEditingIndex(null);
    setFormData({
      name: "",
      description: "",
      role: "",
      url: "",
      technologies: [],
      date: "",
    });
    setOpen(true);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setFormData(projects[index]);
    setOpen(true);
  };

const handleSave = () => {
  const updatedProjects = editingIndex !== null
    ? projects.map((proj, i) => i === editingIndex ? formData : proj)
    : [...projects, formData];
  
  onChange(updatedProjects);
  setOpen(false);
  
  onSave?.(updatedProjects);
};

  const handleDelete = (index: number) => {
    onChange(projects.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Proyecto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? "Editar" : "Agregar"} Proyecto
              </DialogTitle>
              <DialogDescription>
                Describe un proyecto en el que hayas trabajado
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Nombre del Proyecto *</Label>
                <Input
                  id="project-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Sistema de Gestión Escolar"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-desc">Descripción *</Label>
                <Textarea
                  id="project-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el proyecto, su objetivo y resultados..."
                  rows={4}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project-role">Tu Rol</Label>
                  <Input
                    id="project-role"
                    value={formData.role || ""}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Ej: Desarrollador Full Stack"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-date">Fecha</Label>
                  <Input
                    id="project-date"
                    value={formData.date || ""}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    placeholder="Ej: Enero 2024 - Marzo 2024"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-url">
                  <ExternalLink className="w-4 h-4 inline mr-1" />
                  URL del Proyecto
                </Label>
                <Input
                  id="project-url"
                  type="url"
                  value={formData.url || ""}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Tecnologías Utilizadas</Label>
                <TagInput
                  value={formData.technologies || []}
                  onChange={(tags) => setFormData({ ...formData, technologies: tags })}
                  placeholder="Escribe y presiona Enter (Ej: React, Node.js)"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!formData.name || !formData.description}
              >
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No has agregado proyectos aún
        </p>
      ) : (
        <div className="space-y-3">
          {projects.map((project, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="font-semibold">{project.name}</h4>
                  {project.role && (
                    <p className="text-sm text-muted-foreground">{project.role}</p>
                  )}
                  {project.date && (
                    <p className="text-xs text-muted-foreground mt-1">{project.date}</p>
                  )}
                  {project.description && (
                    <p className="text-sm mt-2">{project.description}</p>
                  )}
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {project.technologies.map((tech, i) => (
                        <span
                          key={i}
                          className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                  {project.url && (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ver proyecto →
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(index)}>
                    <FolderGit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};