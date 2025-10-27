import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, Plus, Trash2, Upload, X, FileText, Save } from "lucide-react";
import { useCloudinary } from "@/hooks/useCloudinary";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormalEducation {
  degree: string;
  field_of_study: string;
  institution: string;
  start_date: string;
  end_date?: string;
  currently_studying: boolean;
  description?: string;
  certificate_url?: string;
}

interface FormalEducationEditorProps {
  education: FormalEducation[];
  onChange: (education: FormalEducation[]) => void;
  onSave?: () => void;
}

export const FormalEducationEditor = ({ education, onChange, onSave }: FormalEducationEditorProps) => {
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { uploadFile, uploading } = useCloudinary();
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormalEducation>({
    degree: "",
    field_of_study: "",
    institution: "",
    start_date: "",
    end_date: "",
    currently_studying: false,
    description: "",
    certificate_url: "",
  });

  const handleAdd = () => {
    setEditingIndex(null);
    setFormData({
      degree: "",
      field_of_study: "",
      institution: "",
      start_date: "",
      end_date: "",
      currently_studying: false,
      description: "",
      certificate_url: "",
    });
    setOpen(true);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setFormData(education[index]);
    setOpen(true);
  };

  const handleSave = () => {
    if (editingIndex !== null) {
      const updated = [...education];
      updated[editingIndex] = formData;
      onChange(updated);
    } else {
      onChange([...education, formData]);
    }
    setOpen(false);
  };

  const handleDelete = (index: number) => {
    onChange(education.filter((_, i) => i !== index));
  };

  const handleCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "El certificado no debe superar 10MB",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = await uploadFile(file, "raw");
      if (url) {
        setFormData({ ...formData, certificate_url: url });
        toast({
          title: "Certificado cargado",
          description: "El certificado ha sido cargado exitosamente",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar el certificado",
        variant: "destructive",
      });
    }
  };

  const handleRemoveCertificate = () => {
    setFormData({ ...formData, certificate_url: "" });
  };

  const degrees = [
    { value: "bachiller", label: "Bachiller" },
    { value: "tecnico", label: "Técnico" },
    { value: "tecnologo", label: "Tecnólogo" },
    { value: "profesional", label: "Profesional Universitario" },
    { value: "especializacion", label: "Especialización" },
    { value: "maestria", label: "Maestría" },
    { value: "doctorado", label: "Doctorado" },
    { value: "otro", label: "Otro" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Educación Formal
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingIndex !== null ? "Editar" : "Agregar"} Educación Formal
                </DialogTitle>
                <DialogDescription>
                  Agrega tus estudios formales (bachillerato, universidad, posgrados, etc.)
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="degree">Nivel de Estudios *</Label>
                  <Select
                    value={formData.degree}
                    onValueChange={(value) => setFormData({ ...formData, degree: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el nivel" />
                    </SelectTrigger>
                    <SelectContent>
                      {degrees.map((degree) => (
                        <SelectItem key={degree.value} value={degree.value}>
                          {degree.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="field_of_study">Campo de Estudio / Carrera *</Label>
                  <Input
                    id="field_of_study"
                    value={formData.field_of_study}
                    onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })}
                    placeholder="Ej: Ingeniería de Sistemas, Medicina, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="institution">Institución *</Label>
                  <Input
                    id="institution"
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    placeholder="Ej: Universidad Nacional"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Fecha de Inicio *</Label>
                    <Input
                      id="start_date"
                      type="month"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date">Fecha de Finalización</Label>
                    <Input
                      id="end_date"
                      type="month"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      disabled={formData.currently_studying}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="currently_studying"
                    checked={formData.currently_studying}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      currently_studying: e.target.checked,
                      end_date: e.target.checked ? "" : formData.end_date
                    })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="currently_studying" className="cursor-pointer">
                    Actualmente estudiando
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (Opcional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe actividades, logros o enfoque de tus estudios..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Certificado / Diploma (Opcional)</Label>
                  {formData.certificate_url ? (
                    <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted">
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="flex-1 text-sm truncate">
                        Certificado adjunto
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveCertificate}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-4 text-center">
                      <input
                        type="file"
                        id="certificate"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleCertificateUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                      <label
                        htmlFor="certificate"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <Upload className="w-8 h-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {uploading ? "Subiendo..." : "Haz clic para subir certificado"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, JPG o PNG • Máx. 10MB
                        </p>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={!formData.degree || !formData.field_of_study || !formData.institution || !formData.start_date}
                >
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {education.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No has agregado educación formal aún
          </p>
        ) : (
          <div className="space-y-3">
            {education.map((edu, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-semibold">
                      {degrees.find(d => d.value === edu.degree)?.label || edu.degree}
                    </h4>
                    <p className="text-sm font-medium">{edu.field_of_study}</p>
                    <p className="text-sm text-muted-foreground">{edu.institution}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {edu.start_date} - {edu.currently_studying ? "Presente" : (edu.end_date || "N/A")}
                    </p>
                    {edu.certificate_url && (
                      <a
                        href={edu.certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        Ver certificado →
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(index)}>
                      <GraduationCap className="w-4 h-4" />
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
        
        {onSave && (
          <div className="flex justify-end pt-4">
            <Button onClick={onSave} size="sm">
              <Save className="w-4 h-4 mr-2" />
              Guardar Educación
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
