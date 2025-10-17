import { useState } from "react";
import { Search, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RouteSearchModal } from "@/components/learning-paths/RouteSearchModal";
import { ImageUpload } from "@/components/learning-paths/ImageUpload";
import { Combobox } from "@/components/ui/combobox";
import { subjects, subjectToCategoryMap } from "@/lib/subjects";
import { Badge } from "@/components/ui/badge";

const learningTypes = [
  { value: "Visual", label: "Visual" },
  { value: "Auditivo", label: "Auditivo" },
  { value: "Kinestésico", label: "Kinestésico" },
  { value: "Lógico", label: "Lógico" },
];

interface PathBasicInfoProps {
  data: any;
  onChange: (data: any) => void;
  pathId: string | null;
}

export const PathBasicInfo = ({ data, onChange }: PathBasicInfoProps) => {
  const [showRouteSearch, setShowRouteSearch] = useState(false);
  const [requiresPrerequisites, setRequiresPrerequisites] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const grades = [
    { value: "primaria", label: "Primaria" },
    { value: "secundaria", label: "Secundaria" },
    { value: "preparatoria", label: "Preparatoria" },
    { value: "universidad", label: "Universidad" },
  ];

  const handleTogglePrerequisites = (checked: boolean) => {
    setRequiresPrerequisites(checked);
    if (checked) {
      setShowRouteSearch(true);
    } else {
      onChange({ ...data, required_routes: [] });
    }
  };

  const handleSelectRoutes = (routes: string[]) => {
    onChange({ ...data, required_routes: routes });
    setShowRouteSearch(false);
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const currentTags = data.tags || [];
      if (!currentTags.includes(tagInput.trim())) {
        onChange({ ...data, tags: [...currentTags, tagInput.trim()] });
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = data.tags || [];
    onChange({ ...data, tags: currentTags.filter((tag: string) => tag !== tagToRemove) });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Título de la ruta *</Label>
          <Input
            id="title"
            placeholder="Ej: Introducción a la Geometría"
            value={data.title}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            placeholder="Describe de qué trata esta ruta de aprendizaje..."
            value={data.description}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            className="mt-1.5 min-h-24"
          />
        </div>

        <div>
          <Label htmlFor="objectives">Objetivos de aprendizaje</Label>
          <Textarea
            id="objectives"
            placeholder="¿Qué aprenderán los estudiantes?"
            value={data.objectives}
            onChange={(e) => onChange({ ...data, objectives: e.target.value })}
            className="mt-1.5 min-h-24"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="subject">Asignatura *</Label>
            <Combobox
              options={subjects}
              value={data.subject || ""}
              onChange={(value) => {
                const categoryValue = subjectToCategoryMap[value] || value;
                onChange({ ...data, subject: value, category: categoryValue });
              }}
              placeholder="Selecciona asignatura"
              searchPlaceholder="Buscar asignatura..."
              emptyMessage="No se encontró la asignatura."
            />
          </div>

          <div>
            <Label htmlFor="topic">Tema</Label>
            <Input
              id="topic"
              placeholder="Ej: Figuras geométricas"
              value={data.topic}
              onChange={(e) => onChange({ ...data, topic: e.target.value })}
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="grade">Grado *</Label>
            <Select
              value={data.grade_level}
              onValueChange={(value) => onChange({ ...data, grade_level: value })}
            >
              <SelectTrigger id="grade" className="mt-1.5">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((grade) => (
                  <SelectItem key={grade.value} value={grade.value}>
                    {grade.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="level">Nivel de dificultad</Label>
            <Select
              value={data.level}
              onValueChange={(value) => onChange({ ...data, level: value })}
            >
              <SelectTrigger id="level" className="mt-1.5">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basico">Básico</SelectItem>
                <SelectItem value="intermedio">Intermedio</SelectItem>
                <SelectItem value="avanzado">Avanzado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="learning_type">Tipo de Aprendizaje Principal</Label>
          <Select
            value={data.tipo_aprendizaje}
            onValueChange={(value) => onChange({ ...data, tipo_aprendizaje: value })}
          >
            <SelectTrigger id="learning_type" className="mt-1.5">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {learningTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-1">
            Indica el estilo de aprendizaje predominante de esta ruta
          </p>
        </div>

        <div>
          <Label htmlFor="estimated_duration">Duración estimada (minutos)</Label>
          <Input
            id="estimated_duration"
            type="number"
            min="0"
            placeholder="Ej: 60"
            value={data.estimated_duration || ""}
            onChange={(e) => onChange({ ...data, estimated_duration: parseInt(e.target.value) || 0 })}
            className="mt-1.5"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Tiempo aproximado para completar toda la ruta
          </p>
        </div>

        <div>
          <Label htmlFor="tags">Etiquetas</Label>
          <Input
            id="tags"
            placeholder="Escribe una etiqueta y presiona Enter"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            className="mt-1.5"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Agrega etiquetas para facilitar la búsqueda de esta ruta
          </p>
          {data.tags && data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {data.tags.map((tag: string, index: number) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {tag}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <ImageUpload
            value={data.cover_url}
            onChange={(url) => onChange({ ...data, cover_url: url })}
            label="Imagen de portada"
          />
        </div>
      </div>

      <div className="border-t pt-6 space-y-4">
        <h3 className="font-semibold text-lg">Configuración</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Forzar orden secuencial</Label>
            <p className="text-sm text-muted-foreground">
              Los estudiantes deben completar las cápsulas en orden
            </p>
          </div>
          <Switch
            checked={data.enforce_order}
            onCheckedChange={(checked) => onChange({ ...data, enforce_order: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Requerir aprobar quiz para continuar</Label>
            <p className="text-sm text-muted-foreground">
              Los quizzes deben aprobarse para avanzar
            </p>
          </div>
          <Switch
            checked={data.require_quiz_pass}
            onCheckedChange={(checked) => onChange({ ...data, require_quiz_pass: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Permitir colaboración</Label>
            <p className="text-sm text-muted-foreground">
              Otros pueden sugerir cambios a esta ruta
            </p>
          </div>
          <Switch
            checked={data.allow_collaboration}
            onCheckedChange={(checked) => onChange({ ...data, allow_collaboration: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Visibilidad pública</Label>
            <p className="text-sm text-muted-foreground">
              La ruta será visible para toda la comunidad
            </p>
          </div>
          <Switch
            checked={data.is_public}
            onCheckedChange={(checked) => onChange({ ...data, is_public: checked })}
          />
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="space-y-0.5">
              <Label>🔒 Requerir aprobación de otra ruta</Label>
              <p className="text-sm text-muted-foreground">
                Los estudiantes deben completar otras rutas primero
              </p>
            </div>
            <Switch
              checked={requiresPrerequisites}
              onCheckedChange={handleTogglePrerequisites}
            />
          </div>

          {requiresPrerequisites && (
            <div className="mt-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowRouteSearch(true)}
              >
                <Search className="w-4 h-4 mr-2" />
                Buscar rutas prerequisito ({data.required_routes?.length || 0} seleccionadas)
              </Button>
            </div>
          )}
        </div>
      </div>

      <RouteSearchModal
        open={showRouteSearch}
        onClose={() => setShowRouteSearch(false)}
        selectedRoutes={data.required_routes || []}
        onSelect={handleSelectRoutes}
      />
    </div>
  );
};
