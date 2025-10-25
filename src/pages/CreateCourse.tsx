import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/learning-paths/ImageUpload";
import { RouteSearchModal } from "@/components/learning-paths/RouteSearchModal";
import { InstitutionSelector } from "@/components/courses/InstitutionSelector";
import { useCourses } from "@/hooks/useCourses";
import { useLearningPaths } from "@/hooks/useLearningPaths";
import { Database } from "@/integrations/supabase/types";
import { Switch } from "@/components/ui/switch";

type CategoryType = Database["public"]["Enums"]["category_type"];
type GradeLevel = Database["public"]["Enums"]["grade_level"];
type TipoAprendizaje = Database["public"]["Enums"]["tipo_aprendizaje"];

const categories: { value: CategoryType; label: string }[] = [
  { value: "ciencias", label: "Ciencias" },
  { value: "matematicas", label: "Matemáticas" },
  { value: "lenguaje", label: "Lenguaje" },
  { value: "historia", label: "Historia" },
  { value: "tecnologia", label: "Tecnología" },
  { value: "arte", label: "Arte" },
  { value: "otros", label: "Otros" },
];

const gradeLevels: { value: GradeLevel; label: string }[] = [
  { value: "preescolar", label: "Preescolar" },
  { value: "primaria", label: "Primaria" },
  { value: "secundaria", label: "Secundaria" },
  { value: "preparatoria", label: "Preparatoria" },
  { value: "universidad", label: "Universidad" },
  { value: "libre", label: "Libre" },
];

const learningTypes: { value: TipoAprendizaje; label: string }[] = [
  { value: "Lógico-Matemática", label: "🧠 Lógico-Matemática" },
  { value: "Lingüístico-Verbal", label: "🗣️ Lingüístico-Verbal" },
  { value: "Visual-Espacial", label: "🎨 Visual-Espacial" },
  { value: "Musical", label: "🎶 Musical" },
  { value: "Corporal-Kinestésica", label: "🏃 Corporal-Kinestésica" },
  { value: "Interpersonal", label: "🤝 Interpersonal" },
  { value: "Intrapersonal", label: "🧘 Intrapersonal" },
  { value: "Naturalista", label: "🌿 Naturalista" },
  { value: "Existencial", label: "💭 Existencial" },
  { value: "Digital-Tecnológica", label: "💻 Digital-Tecnológica" },
  { value: "Creativa-Innovadora", label: "🧩 Creativa-Innovadora" },
  { value: "Emocional", label: "🕊️ Emocional" },
];

export default function CreateCourse() {
  const navigate = useNavigate();
  const { createCourse } = useCourses();
  const { paths } = useLearningPaths(undefined, "all");
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    cover_url: "",
    category: "" as CategoryType,
    grade_level: "" as GradeLevel,
    learning_types: [] as TipoAprendizaje[],
    tags: [] as string[],
    is_public: true,
    institutions: [] as string[],
  });

  const [levels, setLevels] = useState<Array<{
    id: string;
    name: string;
    description: string;
    routes: string[];
    expanded: boolean;
  }>>([]);
  const [currentLevelId, setCurrentLevelId] = useState<string | null>(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newLevelName, setNewLevelName] = useState("");
  const [newLevelDescription, setNewLevelDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.category || !formData.grade_level) {
      return;
    }

    // Validate that private courses have at least one institution
    if (!formData.is_public && formData.institutions.length === 0) {
      toast({
        title: "Error",
        description: "Los cursos privados deben tener al menos una institución seleccionada",
        variant: "destructive",
      });
      return;
    }

    // Validate that there is at least one level with routes
    if (levels.length === 0) {
      toast({
        title: "Error",
        description: "Debes agregar al menos un nivel con rutas de aprendizaje",
        variant: "destructive",
      });
      return;
    }

    const levelsData = levels.map((level, index) => ({
      name: level.name,
      description: level.description,
      order_index: index,
      routes: level.routes.map((routeId, routeIndex) => ({
        path_id: routeId,
        order_index: routeIndex,
        is_required: true,
      })),
    }));

    await createCourse.mutateAsync({
      courseData: formData,
      levels: levelsData,
    });

    navigate("/learning-paths");
  };

  const handleLearningTypeToggle = (type: TipoAprendizaje) => {
    setFormData(prev => ({
      ...prev,
      learning_types: prev.learning_types.includes(type)
        ? prev.learning_types.filter(t => t !== type)
        : [...prev.learning_types, type]
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleAddLevel = () => {
    if (!newLevelName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del nivel es obligatorio",
        variant: "destructive",
      });
      return;
    }

    const newLevel = {
      id: crypto.randomUUID(),
      name: newLevelName.trim(),
      description: newLevelDescription.trim(),
      routes: [],
      expanded: true,
    };

    setLevels(prev => [...prev, newLevel]);
    setNewLevelName("");
    setNewLevelDescription("");
  };

  const handleRemoveLevel = (levelId: string) => {
    setLevels(prev => prev.filter(level => level.id !== levelId));
  };

  const handleToggleLevel = (levelId: string) => {
    setLevels(prev => prev.map(level => 
      level.id === levelId ? { ...level, expanded: !level.expanded } : level
    ));
  };

  const handleAddRoutesToLevel = (levelId: string) => {
    setCurrentLevelId(levelId);
    setShowRouteModal(true);
  };

  const handleRoutesSelected = (selectedRoutes: string[]) => {
    if (currentLevelId) {
      setLevels(prev => prev.map(level => 
        level.id === currentLevelId 
          ? { ...level, routes: selectedRoutes }
          : level
      ));
    }
    setCurrentLevelId(null);
  };

  const handleRemoveRouteFromLevel = (levelId: string, routeId: string) => {
    setLevels(prev => prev.map(level => 
      level.id === levelId
        ? { ...level, routes: level.routes.filter(id => id !== routeId) }
        : level
    ));
  };

  const handleUpdateLevel = (levelId: string, updates: Partial<{ name: string; description: string }>) => {
    setLevels(prev => prev.map(level => 
      level.id === levelId ? { ...level, ...updates } : level
    ));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Crear Curso</h1>
            <p className="text-sm text-muted-foreground">
              Agrupa múltiples rutas de aprendizaje en un curso completo
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Título del Curso *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej: Matemáticas Completo Secundaria"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe el contenido y objetivos del curso"
                  rows={4}
                />
              </div>

              <div>
                <Label>Portada del Curso</Label>
                <ImageUpload
                  value={formData.cover_url}
                  onChange={(url) => setFormData(prev => ({ ...prev, cover_url: url }))}
                  label="Imagen de portada"
                />
              </div>
            </CardContent>
          </Card>

          {/* Visibility */}
          <Card>
            <CardHeader>
              <CardTitle>Visibilidad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_public">Curso Público</Label>
                  <p className="text-sm text-muted-foreground">
                    Los cursos públicos son visibles para todos los usuarios
                  </p>
                </div>
                <Switch
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) =>
                    setFormData(prev => ({ 
                      ...prev, 
                      is_public: checked,
                      institutions: checked ? [] : prev.institutions 
                    }))
                  }
                />
              </div>

              {!formData.is_public && (
                <InstitutionSelector
                  selectedInstitutions={formData.institutions}
                  onChange={(institutions) =>
                    setFormData(prev => ({ ...prev, institutions }))
                  }
                />
              )}
            </CardContent>
          </Card>

          {/* Classification */}
          <Card>
            <CardHeader>
              <CardTitle>Clasificación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Categoría *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: CategoryType) => 
                      setFormData(prev => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="grade_level">Nivel Educativo *</Label>
                  <Select
                    value={formData.grade_level}
                    onValueChange={(value: GradeLevel) => 
                      setFormData(prev => ({ ...prev, grade_level: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un nivel" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Tipos de Aprendizaje</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {learningTypes.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.value}
                        checked={formData.learning_types.includes(type.value)}
                        onCheckedChange={() => handleLearningTypeToggle(type.value)}
                      />
                      <label
                        htmlFor={type.value}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="tags">Etiquetas</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    id="tags"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Agregar etiqueta"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button type="button" onClick={handleAddTag} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Levels and Routes */}
          <Card>
            <CardHeader>
              <CardTitle>Niveles y Rutas de Aprendizaje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Level */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium">Agregar Nuevo Nivel</h4>
                <div className="space-y-2">
                  <Input
                    placeholder="Nombre del nivel (ej: Fundamentos, Intermedio, Avanzado)"
                    value={newLevelName}
                    onChange={(e) => setNewLevelName(e.target.value)}
                  />
                  <Textarea
                    placeholder="Descripción del nivel (opcional)"
                    value={newLevelDescription}
                    onChange={(e) => setNewLevelDescription(e.target.value)}
                    rows={2}
                  />
                  <Button
                    type="button"
                    onClick={handleAddLevel}
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Nivel
                  </Button>
                </div>
              </div>

              {/* Levels List */}
              {levels.length > 0 && (
                <div className="space-y-3">
                  {levels.map((level, levelIndex) => {
                    const levelPaths = paths?.filter(path => level.routes.includes(path.id));
                    
                    return (
                      <div key={level.id} className="border rounded-lg overflow-hidden">
                        {/* Level Header */}
                        <div className="flex items-center justify-between p-3 bg-muted/50">
                          <div className="flex items-center gap-3 flex-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleLevel(level.id)}
                            >
                              {level.expanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Nivel {levelIndex + 1}: {level.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {level.routes.length} ruta{level.routes.length !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                              {level.description && (
                                <p className="text-sm text-muted-foreground mt-1">{level.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddRoutesToLevel(level.id)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Rutas
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveLevel(level.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Level Editor */}
                        {level.expanded && (
                          <div className="p-3 border-t bg-background/50 space-y-2">
                            <Label>Nombre del nivel</Label>
                            <Input
                              value={level.name}
                              onChange={(e) => handleUpdateLevel(level.id, { name: e.target.value })}
                            />
                            <Label>Descripción</Label>
                            <Textarea
                              rows={2}
                              value={level.description}
                              onChange={(e) => handleUpdateLevel(level.id, { description: e.target.value })}
                            />
                          </div>
                        )}

                        {/* Level Routes */}
                        {level.expanded && levelPaths && levelPaths.length > 0 && (
                          <div className="p-3 space-y-2 bg-background">
                            {levelPaths.map((path, routeIndex) => (
                              <div
                                key={path.id}
                                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors overflow-hidden w-full min-w-0"
                              >
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0 mt-1">
                                  {routeIndex + 1}
                                </div>
                                {(path.thumbnail_url || path.cover_url) && (
                                  <img
                                    src={path.thumbnail_url || path.cover_url}
                                    alt={path.title}
                                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <p className="font-medium truncate">{path.title}</p>
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {path.description || ""}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    {path.subject && (
                                      <Badge variant="secondary" className="text-xs">
                                        {path.subject}
                                      </Badge>
                                    )}
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                      ⚡ {path.total_xp || 0} XP
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveRouteFromLevel(level.id, path.id)}
                                  className="flex-shrink-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {levels.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay niveles agregados. Crea tu primer nivel para organizar las rutas de aprendizaje.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Course Preview */}
          {(formData.title || formData.cover_url || levels.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Vista Previa del Curso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.cover_url && (
                  <div className="w-full aspect-video rounded-lg overflow-hidden">
                    <img
                      src={formData.cover_url}
                      alt={formData.title || "Portada del curso"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {formData.title && (
                  <div>
                    <h3 className="text-2xl font-bold">{formData.title}</h3>
                    {formData.description && (
                      <p className="text-muted-foreground mt-2">{formData.description}</p>
                    )}
                  </div>
                )}

                {formData.category && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">
                      {categories.find(c => c.value === formData.category)?.label}
                    </Badge>
                    {formData.grade_level && (
                      <Badge variant="outline">
                        {gradeLevels.find(g => g.value === formData.grade_level)?.label}
                      </Badge>
                    )}
                    {formData.learning_types.length > 0 && (
                      formData.learning_types.map(type => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {learningTypes.find(l => l.value === type)?.label}
                        </Badge>
                      ))
                    )}
                  </div>
                )}


                {levels.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">
                      Estructura del curso ({levels.length} nivel{levels.length !== 1 ? 'es' : ''})
                    </h4>
                    <div className="space-y-3">
                      {levels.map((level, levelIndex) => {
                        const levelPaths = paths?.filter(path => level.routes.includes(path.id)) || [];
                        const levelXP = levelPaths.reduce((sum, path) => sum + (path.total_xp || 0), 0);
                        
                        return (
                          <div key={level.id} className="border rounded-lg overflow-hidden">
                            <div className="p-3 bg-muted/30">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold">Nivel {levelIndex + 1}: {level.name}</p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {level.routes.length} ruta{level.routes.length !== 1 ? 's' : ''}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    ⚡ {levelXP} XP
                                  </span>
                                </div>
                              </div>
                              {level.description && (
                                <p className="text-xs text-muted-foreground mt-1">{level.description}</p>
                              )}
                            </div>
                            {levelPaths.length > 0 && (
                              <div className="p-3 space-y-2">
                                {levelPaths.map((path, index) => (
                                  <div
                                    key={path.id}
                                    className="flex items-center gap-3 p-2 border rounded-lg bg-muted/10"
                                  >
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex-shrink-0">
                                      {index + 1}
                                    </div>
                                    {(path.thumbnail_url || path.cover_url) && (
                                      <img
                                        src={path.thumbnail_url || path.cover_url}
                                        alt={path.title}
                                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                      <p className="text-xs font-medium truncate">{path.title}</p>
                                      <p className="text-xs text-muted-foreground">
                                        ⚡ {path.total_xp || 0} XP
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 p-3 bg-primary/5 rounded-lg">
                      <p className="text-sm font-medium">
                        Total XP: ⚡ {levels.reduce((sum, level) => {
                          const levelPaths = paths?.filter(path => level.routes.includes(path.id)) || [];
                          return sum + levelPaths.reduce((pathSum, path) => pathSum + (path.total_xp || 0), 0);
                        }, 0)} XP
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createCourse.isPending || !formData.title || !formData.category || !formData.grade_level}
              className="flex-1"
            >
              {createCourse.isPending ? "Creando..." : "Crear Curso"}
            </Button>
          </div>
        </form>
      </div>

      <RouteSearchModal
        open={showRouteModal}
        onClose={() => {
          setShowRouteModal(false);
          setCurrentLevelId(null);
        }}
        selectedRoutes={currentLevelId ? (levels.find(l => l.id === currentLevelId)?.routes || []) : []}
        onSelect={handleRoutesSelected}
      />
    </div>
  );
}
