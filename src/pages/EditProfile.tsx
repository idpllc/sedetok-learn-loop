import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useProfileUpdate } from "@/hooks/useProfileUpdate";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, isLoading, updateProfile } = useProfileUpdate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    // Datos generales
    full_name: "",
    tipo_documento: "",
    numero_documento: "",
    fecha_nacimiento: "",
    genero: "",
    pais: "",
    departamento: "",
    municipio: "",
    idioma_preferido: "Español",
    tipo_usuario: "Estudiante",
    nivel_educativo: "",
    grado_actual: "",
    institution: "",
    bio: "",
    
    // Perfil cognitivo
    tipo_aprendizaje: "",
    nivel_motivacion: "",
    preferencia_duracion_contenido: "",
    horario_preferido_estudio: "",
    modo_consumo_preferido: "",
    frecuencia_estudio: "",
    nivel_autonomia: "",
    dificultades_aprendizaje: "",
    idioma_contenido_preferido: "Español",
    
    // Intereses
    areas_interes: "",
    temas_favoritos: "",
    profesiones_de_interes: "",
    habilidades_a_desarrollar: "",
    motivaciones_principales: "",
    nivel_meta_aprendizaje: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        tipo_documento: profile.tipo_documento || "",
        numero_documento: profile.numero_documento || "",
        fecha_nacimiento: profile.fecha_nacimiento || "",
        genero: profile.genero || "",
        pais: profile.pais || "",
        departamento: profile.departamento || "",
        municipio: profile.municipio || "",
        idioma_preferido: profile.idioma_preferido || "Español",
        tipo_usuario: profile.tipo_usuario || "Estudiante",
        nivel_educativo: profile.nivel_educativo || "",
        grado_actual: profile.grado_actual || "",
        institution: profile.institution || "",
        bio: profile.bio || "",
        tipo_aprendizaje: profile.tipo_aprendizaje || "",
        nivel_motivacion: profile.nivel_motivacion?.toString() || "",
        preferencia_duracion_contenido: profile.preferencia_duracion_contenido || "",
        horario_preferido_estudio: profile.horario_preferido_estudio || "",
        modo_consumo_preferido: profile.modo_consumo_preferido || "",
        frecuencia_estudio: profile.frecuencia_estudio || "",
        nivel_autonomia: profile.nivel_autonomia || "",
        dificultades_aprendizaje: profile.dificultades_aprendizaje || "",
        idioma_contenido_preferido: profile.idioma_contenido_preferido || "Español",
        areas_interes: profile.areas_interes?.join(", ") || "",
        temas_favoritos: profile.temas_favoritos?.join(", ") || "",
        profesiones_de_interes: profile.profesiones_de_interes?.join(", ") || "",
        habilidades_a_desarrollar: profile.habilidades_a_desarrollar?.join(", ") || "",
        motivaciones_principales: profile.motivaciones_principales || "",
        nivel_meta_aprendizaje: profile.nivel_meta_aprendizaje || "",
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates: any = {
      full_name: formData.full_name || null,
      tipo_documento: formData.tipo_documento || null,
      numero_documento: formData.numero_documento || null,
      fecha_nacimiento: formData.fecha_nacimiento || null,
      genero: formData.genero || null,
      pais: formData.pais || null,
      departamento: formData.departamento || null,
      municipio: formData.municipio || null,
      idioma_preferido: formData.idioma_preferido || "Español",
      tipo_usuario: formData.tipo_usuario || "Estudiante",
      nivel_educativo: formData.nivel_educativo || null,
      grado_actual: formData.grado_actual || null,
      institution: formData.institution || null,
      bio: formData.bio || null,
      tipo_aprendizaje: formData.tipo_aprendizaje || null,
      nivel_motivacion: formData.nivel_motivacion ? parseInt(formData.nivel_motivacion) : null,
      preferencia_duracion_contenido: formData.preferencia_duracion_contenido || null,
      horario_preferido_estudio: formData.horario_preferido_estudio || null,
      modo_consumo_preferido: formData.modo_consumo_preferido || null,
      frecuencia_estudio: formData.frecuencia_estudio || null,
      nivel_autonomia: formData.nivel_autonomia || null,
      dificultades_aprendizaje: formData.dificultades_aprendizaje || null,
      idioma_contenido_preferido: formData.idioma_contenido_preferido || "Español",
      areas_interes: formData.areas_interes ? formData.areas_interes.split(",").map(s => s.trim()) : null,
      temas_favoritos: formData.temas_favoritos ? formData.temas_favoritos.split(",").map(s => s.trim()) : null,
      profesiones_de_interes: formData.profesiones_de_interes ? formData.profesiones_de_interes.split(",").map(s => s.trim()) : null,
      habilidades_a_desarrollar: formData.habilidades_a_desarrollar ? formData.habilidades_a_desarrollar.split(",").map(s => s.trim()) : null,
      motivaciones_principales: formData.motivaciones_principales || null,
      nivel_meta_aprendizaje: formData.nivel_meta_aprendizaje || null,
    };

    try {
      await updateProfile(updates);
      toast({
        title: "Perfil actualizado",
        description: "Tus cambios se guardaron correctamente",
      });
      navigate("/profile");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil",
        variant: "destructive",
      });
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4 animate-pulse">📚</div>
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Editar Perfil</h1>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Editar Perfil 360°</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos Generales */}
          <Card>
            <CardHeader>
              <CardTitle>Datos Generales</CardTitle>
              <CardDescription>Información básica de tu perfil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nombre Completo *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo_documento">Tipo de Documento</Label>
                  <Select value={formData.tipo_documento} onValueChange={(val) => setFormData({ ...formData, tipo_documento: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RC">RC - Registro Civil</SelectItem>
                      <SelectItem value="TI">TI - Tarjeta de Identidad</SelectItem>
                      <SelectItem value="CC">CC - Cédula de Ciudadanía</SelectItem>
                      <SelectItem value="CE">CE - Cédula de Extranjería</SelectItem>
                      <SelectItem value="PPT">PPT - Pasaporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero_documento">Número de Documento</Label>
                  <Input
                    id="numero_documento"
                    value={formData.numero_documento}
                    onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                    placeholder="Ingresa tu número de documento"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                  <Input
                    id="fecha_nacimiento"
                    type="date"
                    value={formData.fecha_nacimiento}
                    onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genero">Género</Label>
                  <Select value={formData.genero} onValueChange={(val) => setFormData({ ...formData, genero: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona género" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Femenino">Femenino</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                      <SelectItem value="Prefiero no decir">Prefiero no decir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pais">País</Label>
                  <Input
                    id="pais"
                    value={formData.pais}
                    onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento</Label>
                  <Input
                    id="departamento"
                    value={formData.departamento}
                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="municipio">Municipio</Label>
                  <Input
                    id="municipio"
                    value={formData.municipio}
                    onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo_usuario">Tipo de Usuario *</Label>
                  <Select value={formData.tipo_usuario} onValueChange={(val) => setFormData({ ...formData, tipo_usuario: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Estudiante">Estudiante</SelectItem>
                      <SelectItem value="Docente">Docente</SelectItem>
                      <SelectItem value="Padre">Padre</SelectItem>
                      <SelectItem value="Institución">Institución</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nivel_educativo">Nivel Educativo</Label>
                  <Select value={formData.nivel_educativo} onValueChange={(val) => setFormData({ ...formData, nivel_educativo: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona nivel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Preescolar">Preescolar</SelectItem>
                      <SelectItem value="Primaria">Primaria</SelectItem>
                      <SelectItem value="Secundaria">Secundaria</SelectItem>
                      <SelectItem value="Media">Media</SelectItem>
                      <SelectItem value="Universitario">Universitario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grado_actual">Grado Actual</Label>
                  <Input
                    id="grado_actual"
                    value={formData.grado_actual}
                    onChange={(e) => setFormData({ ...formData, grado_actual: e.target.value })}
                    placeholder="Ej: 10°, Grado 5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institution">Institución</Label>
                  <Input
                    id="institution"
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Biografía</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Cuéntanos sobre ti..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Perfil Cognitivo */}
          <Card>
            <CardHeader>
              <CardTitle>Perfil de Aprendizaje</CardTitle>
              <CardDescription>Ayúdanos a personalizar tu experiencia educativa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo_aprendizaje">Tipo de Aprendizaje</Label>
                  <Select value={formData.tipo_aprendizaje} onValueChange={(val) => setFormData({ ...formData, tipo_aprendizaje: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="¿Cómo aprendes mejor?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Visual">Visual</SelectItem>
                      <SelectItem value="Auditivo">Auditivo</SelectItem>
                      <SelectItem value="Kinestésico">Kinestésico</SelectItem>
                      <SelectItem value="Lógico">Lógico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nivel_motivacion">Nivel de Motivación (1-5)</Label>
                  <Select value={formData.nivel_motivacion} onValueChange={(val) => setFormData({ ...formData, nivel_motivacion: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona nivel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Muy baja</SelectItem>
                      <SelectItem value="2">2 - Baja</SelectItem>
                      <SelectItem value="3">3 - Media</SelectItem>
                      <SelectItem value="4">4 - Alta</SelectItem>
                      <SelectItem value="5">5 - Muy alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preferencia_duracion_contenido">Duración Preferida</Label>
                  <Select value={formData.preferencia_duracion_contenido} onValueChange={(val) => setFormData({ ...formData, preferencia_duracion_contenido: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Duración de contenido" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Corto">Corto (&lt;5 min)</SelectItem>
                      <SelectItem value="Medio">Medio (5-15 min)</SelectItem>
                      <SelectItem value="Largo">Largo (&gt;15 min)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horario_preferido_estudio">Horario de Estudio</Label>
                  <Select value={formData.horario_preferido_estudio} onValueChange={(val) => setFormData({ ...formData, horario_preferido_estudio: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="¿Cuándo estudias?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mañana">Mañana</SelectItem>
                      <SelectItem value="Tarde">Tarde</SelectItem>
                      <SelectItem value="Noche">Noche</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modo_consumo_preferido">Modo de Consumo</Label>
                  <Select value={formData.modo_consumo_preferido} onValueChange={(val) => setFormData({ ...formData, modo_consumo_preferido: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="¿Qué prefieres?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Videos">Videos</SelectItem>
                      <SelectItem value="PDF">PDF</SelectItem>
                      <SelectItem value="Quizzes">Quizzes</SelectItem>
                      <SelectItem value="Textos">Textos</SelectItem>
                      <SelectItem value="Mixto">Mixto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frecuencia_estudio">Frecuencia de Estudio</Label>
                  <Select value={formData.frecuencia_estudio} onValueChange={(val) => setFormData({ ...formData, frecuencia_estudio: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="¿Con qué frecuencia?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Diaria">Diaria</SelectItem>
                      <SelectItem value="Semanal">Semanal</SelectItem>
                      <SelectItem value="Esporádica">Esporádica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nivel_autonomia">Nivel de Autonomía</Label>
                <Select value={formData.nivel_autonomia} onValueChange={(val) => setFormData({ ...formData, nivel_autonomia: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="¿Cuánta guía necesitas?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alta">Alta - Aprendo solo</SelectItem>
                    <SelectItem value="Media">Media - Necesito algo de guía</SelectItem>
                    <SelectItem value="Baja">Baja - Necesito mucha guía</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dificultades_aprendizaje">Dificultades de Aprendizaje (Opcional)</Label>
                <Textarea
                  id="dificultades_aprendizaje"
                  value={formData.dificultades_aprendizaje}
                  onChange={(e) => setFormData({ ...formData, dificultades_aprendizaje: e.target.value })}
                  placeholder="Describe cualquier dificultad que tengamos que considerar..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Intereses */}
          <Card>
            <CardHeader>
              <CardTitle>Intereses y Objetivos</CardTitle>
              <CardDescription>Define tus metas de aprendizaje</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="areas_interes">Áreas de Interés</Label>
                <Input
                  id="areas_interes"
                  value={formData.areas_interes}
                  onChange={(e) => setFormData({ ...formData, areas_interes: e.target.value })}
                  placeholder="Ej: Matemáticas, Ciencias, Historia (separadas por coma)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="temas_favoritos">Temas Favoritos</Label>
                <Input
                  id="temas_favoritos"
                  value={formData.temas_favoritos}
                  onChange={(e) => setFormData({ ...formData, temas_favoritos: e.target.value })}
                  placeholder="Ej: Geometría, Física cuántica, Segunda Guerra Mundial"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profesiones_de_interes">Profesiones de Interés</Label>
                <Input
                  id="profesiones_de_interes"
                  value={formData.profesiones_de_interes}
                  onChange={(e) => setFormData({ ...formData, profesiones_de_interes: e.target.value })}
                  placeholder="Ej: Ingeniero, Médico, Profesor"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="habilidades_a_desarrollar">Habilidades a Desarrollar</Label>
                <Input
                  id="habilidades_a_desarrollar"
                  value={formData.habilidades_a_desarrollar}
                  onChange={(e) => setFormData({ ...formData, habilidades_a_desarrollar: e.target.value })}
                  placeholder="Ej: Pensamiento crítico, Trabajo en equipo, Programación"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="motivaciones_principales">Motivación Principal</Label>
                  <Select value={formData.motivaciones_principales} onValueChange={(val) => setFormData({ ...formData, motivaciones_principales: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="¿Por qué aprendes?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aprender">Aprender</SelectItem>
                      <SelectItem value="Certificarme">Certificarme</SelectItem>
                      <SelectItem value="Superarme">Superarme</SelectItem>
                      <SelectItem value="Jugar">Jugar</SelectItem>
                      <SelectItem value="Competir">Competir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nivel_meta_aprendizaje">Nivel Meta</Label>
                  <Select value={formData.nivel_meta_aprendizaje} onValueChange={(val) => setFormData({ ...formData, nivel_meta_aprendizaje: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="¿Dónde quieres llegar?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inicial">Inicial</SelectItem>
                      <SelectItem value="Intermedio">Intermedio</SelectItem>
                      <SelectItem value="Avanzado">Avanzado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate("/profile")}>
              Cancelar
            </Button>
            <Button type="submit" className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Guardar Cambios
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default EditProfile;
