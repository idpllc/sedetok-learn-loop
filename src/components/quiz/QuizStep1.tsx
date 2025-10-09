import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Database } from "@/integrations/supabase/types";

type CategoryType = Database["public"]["Enums"]["category_type"];
type GradeLevel = Database["public"]["Enums"]["grade_level"];

const CATEGORIES: CategoryType[] = ["matematicas", "ciencias", "lenguaje", "historia", "arte", "tecnologia", "otros"];
const GRADES: GradeLevel[] = ["primaria", "secundaria", "preparatoria", "universidad"];

interface QuizStep1Props {
  formData: {
    title: string;
    description: string;
    category: string;
    grade_level: string;
    difficulty: string;
    is_public: boolean;
  };
  onChange: (field: string, value: any) => void;
}

export const QuizStep1 = ({ formData, onChange }: QuizStep1Props) => {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="title">Título del Quiz *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="Ej: Quiz de Matemáticas - Fracciones"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Describe brevemente el contenido del quiz"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Asignatura *</Label>
          <Select value={formData.category} onValueChange={(value) => onChange("category", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una asignatura" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="grade_level">Grado *</Label>
          <Select value={formData.grade_level} onValueChange={(value) => onChange("grade_level", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un grado" />
            </SelectTrigger>
            <SelectContent>
              {GRADES.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {grade.charAt(0).toUpperCase() + grade.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="difficulty">Nivel de dificultad *</Label>
        <Select value={formData.difficulty} onValueChange={(value) => onChange("difficulty", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona el nivel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="basico">Básico</SelectItem>
            <SelectItem value="intermedio">Intermedio</SelectItem>
            <SelectItem value="avanzado">Avanzado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Visibilidad</Label>
          <p className="text-sm text-muted-foreground">
            {formData.is_public ? "Público (visible para todos)" : "Privado (solo tú)"}
          </p>
        </div>
        <Switch
          checked={formData.is_public}
          onCheckedChange={(checked) => onChange("is_public", checked)}
        />
      </div>
    </div>
  );
};
