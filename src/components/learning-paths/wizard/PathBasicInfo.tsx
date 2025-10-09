import { useState } from "react";
import { Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RouteSearchModal } from "@/components/learning-paths/RouteSearchModal";

interface PathBasicInfoProps {
  data: any;
  onChange: (data: any) => void;
  pathId: string | null;
}

export const PathBasicInfo = ({ data, onChange }: PathBasicInfoProps) => {
  const [showRouteSearch, setShowRouteSearch] = useState(false);
  const [requiresPrerequisites, setRequiresPrerequisites] = useState(false);

  const subjects = [
    "Matemáticas", "Ciencias", "Lenguaje", "Ciencias Sociales",
    "Inglés", "Educación Física", "Artes", "Tecnología"
  ];

  const grades = [
    "Preescolar", "Primero", "Segundo", "Tercero", "Cuarto", "Quinto",
    "Sexto", "Séptimo", "Octavo", "Noveno", "Décimo", "Once"
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
            <Select
              value={data.subject}
              onValueChange={(value) => onChange({ ...data, subject: value })}
            >
              <SelectTrigger id="subject" className="mt-1.5">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <SelectItem key={grade} value={grade}>
                    {grade}
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
          <Label htmlFor="cover">Imagen de portada</Label>
          <Input
            id="cover"
            type="url"
            placeholder="URL de la imagen"
            value={data.cover_url}
            onChange={(e) => onChange({ ...data, cover_url: e.target.value })}
            className="mt-1.5"
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
