import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subjects } from "@/lib/subjects";

interface PathFiltersProps {
  filters: {
    subject: string;
    grade: string;
    status: string;
    visibility: string;
  };
  onFiltersChange: (filters: any) => void;
}

export const PathFilters = ({ filters, onFiltersChange }: PathFiltersProps) => {
  const grades = [
    { value: "primaria", label: "Primaria" },
    { value: "secundaria", label: "Secundaria" },
    { value: "preparatoria", label: "Preparatoria" },
    { value: "universidad", label: "Universidad" },
    { value: "libre", label: "Libre" },
  ];

  return (
    <div className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="subject">Asignatura</Label>
            <Select
              value={filters.subject}
              onValueChange={(value) => onFiltersChange({ ...filters, subject: value })}
            >
              <SelectTrigger id="subject">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.value} value={subject.label}>
                    {subject.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="grade">Grado</Label>
            <Select
              value={filters.grade}
              onValueChange={(value) => onFiltersChange({ ...filters, grade: value })}
            >
              <SelectTrigger id="grade">
                <SelectValue placeholder="Todos" />
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
            <Label htmlFor="status">Estado</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="published">Publicada</SelectItem>
                <SelectItem value="archived">Archivada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="visibility">Visibilidad</Label>
            <Select
              value={filters.visibility}
              onValueChange={(value) => onFiltersChange({ ...filters, visibility: value })}
            >
              <SelectTrigger id="visibility">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Públicas</SelectItem>
                <SelectItem value="private">Privadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};
