import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Database } from "@/integrations/supabase/types";
import { FileUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCloudinary } from "@/hooks/useCloudinary";
import { toast } from "sonner";

type CategoryType = Database["public"]["Enums"]["category_type"];
type GradeLevel = Database["public"]["Enums"]["grade_level"];

const CATEGORIES: CategoryType[] = ["matematicas", "ciencias", "lenguaje", "historia", "arte", "tecnologia", "otros"];
const GRADES: GradeLevel[] = ["primaria", "secundaria", "preparatoria", "universidad", "libre"];

interface QuizStep1Props {
  formData: {
    title: string;
    description: string;
    category: string;
    grade_level: string;
    difficulty: string;
    is_public: boolean;
    document_url?: string;
  };
  onChange: (field: string, value: any) => void;
}

export const QuizStep1 = ({ formData, onChange }: QuizStep1Props) => {
  const { uploadFile, uploading } = useCloudinary();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!validTypes.includes(file.type)) {
      toast.error("Solo se permiten archivos PDF, DOC, DOCX, XLS, XLSX");
      return;
    }

    try {
      const url = await uploadFile(file, "raw");
      onChange("document_url", url);
      toast.success("Documento adjuntado correctamente");
    } catch (error) {
      console.error("Error al subir documento:", error);
    }
  };

  const removeDocument = () => {
    onChange("document_url", undefined);
    toast.success("Documento eliminado");
  };

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

      <div>
        <Label htmlFor="document">Documento de referencia (Opcional)</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Adjunta un PDF, DOC, DOCX, XLS o XLSX para generar preguntas con IA basadas en el documento (2000 XP)
        </p>
        
        {!formData.document_url ? (
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
            <input
              id="document-upload"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <label htmlFor="document-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                <FileUp className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {uploading ? "Subiendo documento..." : "Haz clic para adjuntar un documento"}
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, DOC, DOCX, XLS, XLSX
                </p>
              </div>
            </label>
          </div>
        ) : (
          <div className="border rounded-lg p-4 flex items-center justify-between bg-muted/50">
            <div className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-primary" />
              <span className="text-sm">Documento adjuntado</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeDocument}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
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
