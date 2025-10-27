import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Award } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AwardItem {
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

interface AwardsEditorProps {
  awards: AwardItem[];
  onChange: (awards: AwardItem[]) => void;
  onSave?: (awards: AwardItem[]) => void;
}

export const AwardsEditor = ({ awards, onChange, onSave }: AwardsEditorProps) => {
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<AwardItem>({
    title: "",
    issuer: "",
    date: "",
    description: "",
  });

  const handleAdd = () => {
    setEditingIndex(null);
    setFormData({
      title: "",
      issuer: "",
      date: "",
      description: "",
    });
    setOpen(true);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setFormData(awards[index]);
    setOpen(true);
  };

const handleSave = () => {
  const updatedAwards = editingIndex !== null
    ? awards.map((award, i) => i === editingIndex ? formData : award)
    : [...awards, formData];
  
  onChange(updatedAwards);
  setOpen(false);
  
  onSave?.(updatedAwards);
};

  const handleDelete = (index: number) => {
    onChange(awards.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Premio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? "Editar" : "Agregar"} Premio o Reconocimiento
              </DialogTitle>
              <DialogDescription>
                Agrega un reconocimiento que hayas recibido
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="award-title">Título del Premio *</Label>
                <Input
                  id="award-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej: Mejor Estudiante del Año"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="award-issuer">Otorgado Por *</Label>
                  <Input
                    id="award-issuer"
                    value={formData.issuer}
                    onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                    placeholder="Ej: Universidad Nacional"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="award-date">Fecha *</Label>
                  <Input
                    id="award-date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    placeholder="Ej: Diciembre 2023"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="award-desc">Descripción</Label>
                <Textarea
                  id="award-desc"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el logro o reconocimiento..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!formData.title || !formData.issuer || !formData.date}
              >
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {awards.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No has agregado premios o reconocimientos aún
        </p>
      ) : (
        <div className="space-y-3">
          {awards.map((award, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    {award.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">{award.issuer}</p>
                  <p className="text-xs text-muted-foreground mt-1">{award.date}</p>
                  {award.description && (
                    <p className="text-sm mt-2">{award.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(index)}>
                    <Award className="w-4 h-4" />
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