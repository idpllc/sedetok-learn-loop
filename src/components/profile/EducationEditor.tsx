import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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

interface Education {
  title: string;
  institution: string;
  date: string;
  credential_url?: string;
  verified: boolean;
  description?: string;
  certificate_url?: string;
}

interface EducationEditorProps {
  education: Education[];
  onChange: (education: Education[]) => void;
  onSave?: (education: Education[]) => void;
}

export const EducationEditor = ({ education, onChange, onSave }: EducationEditorProps) => {
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { uploadFile, uploading } = useCloudinary();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Education>({
    title: "",
    institution: "",
    date: "",
    credential_url: "",
    verified: false,
    description: "",
    certificate_url: "",
  });

  const handleAdd = () => {
    setEditingIndex(null);
    setFormData({
      title: "",
      institution: "",
      date: "",
      credential_url: "",
      verified: false,
      description: "",
      certificate_url: "",
    });
    setOpen(true);
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

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setFormData(education[index]);
    setOpen(true);
  };

const handleSave = () => {
  const updatedEducation = editingIndex !== null
    ? education.map((edu, i) => i === editingIndex ? formData : edu)
    : [...education, formData];
  
  onChange(updatedEducation);
  setOpen(false);
  
  onSave?.(updatedEducation);
};

  const handleDelete = (index: number) => {
    onChange(education.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Formación Complementaria
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingIndex !== null ? "Editar" : "Agregar"} Certificación/Curso
                </DialogTitle>
                <DialogDescription>
                  Agrega certificaciones, cursos y formación complementaria
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título/Certificación *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej: Certificación en AWS Cloud Practitioner"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="institution">Institución *</Label>
                  <Input
                    id="institution"
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    placeholder="Ej: Amazon Web Services"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Fecha de Obtención *</Label>
                  <Input
                    id="date"
                    type="month"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credential_url">URL de Credencial (Opcional)</Label>
                  <Input
                    id="credential_url"
                    value={formData.credential_url}
                    onChange={(e) => setFormData({ ...formData, credential_url: e.target.value })}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Enlace para verificar la credencial (ej: Coursera, LinkedIn Learning)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (Opcional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe lo que aprendiste..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="verified"
                    checked={formData.verified}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, verified: checked as boolean })
                    }
                  />
                  <Label htmlFor="verified">Certificación verificada</Label>
                </div>

                <div className="space-y-2">
                  <Label>Certificado (Opcional)</Label>
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
                  disabled={!formData.title || !formData.institution || !formData.date}
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
            No has agregado certificaciones o cursos aún
          </p>
        ) : (
          <div className="space-y-3">
            {education.map((edu, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-semibold flex items-center gap-2">
                      {edu.title}
                      {edu.verified && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          ✓ Verificada
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground">{edu.institution}</p>
                    <p className="text-xs text-muted-foreground mt-1">{edu.date}</p>
                    {edu.credential_url && (
                      <a
                        href={edu.credential_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-1 inline-block"
                      >
                        Ver credencial →
                      </a>
                    )}
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
      </CardContent>
    </Card>
  );
};