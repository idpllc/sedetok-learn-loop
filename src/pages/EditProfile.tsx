import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Save, CheckCircle2 } from "lucide-react";
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
import { useXP } from "@/hooks/useXP";
import { ExperienceEditor } from "@/components/profile/ExperienceEditor";
import { SkillsEditor } from "@/components/profile/SkillsEditor";
import { EducationEditor } from "@/components/profile/EducationEditor";
import { FormalEducationEditor } from "@/components/profile/FormalEducationEditor";
import { SocialLinksEditor } from "@/components/profile/SocialLinksEditor";
import { ProjectsEditor } from "@/components/profile/ProjectsEditor";
import { AwardsEditor } from "@/components/profile/AwardsEditor";
import { TagInput } from "@/components/profile/TagInput";
import { Sidebar } from "@/components/Sidebar";

const EditProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { profile, isLoading, updateProfile } = useProfileUpdate();
  const { toast } = useToast();
  const { awardProfileXP } = useXP();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const previousStateRef = useRef<any>(null);

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
    phone: "",
    idioma_preferido: "Español",
    tipo_usuario: "Estudiante",
    nivel_educativo: "",
    grado_actual: "",
    institution: "",
    bio: "",
    custom_url: "",
    
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
    areas_interes: [] as string[],
    temas_favoritos: [] as string[],
    profesiones_de_interes: [] as string[],
    habilidades_a_desarrollar: [] as string[],
    motivaciones_principales: "",
    nivel_meta_aprendizaje: "",
  });

  // Estados para datos complejos
  const [workExperience, setWorkExperience] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [formalEducation, setFormalEducation] = useState<any[]>([]);
  const [complementaryEducation, setComplementaryEducation] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [awards, setAwards] = useState<any[]>([]);
  const [socialLinks, setSocialLinks] = useState<any>({
    linkedin: "",
    instagram: "",
    facebook: "",
    twitter: "",
    tiktok: "",
    github: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: location.pathname } });
    }
  }, [user, authLoading, navigate, location]);

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
        phone: profile.phone || "",
        idioma_preferido: profile.idioma_preferido || "Español",
        tipo_usuario: profile.tipo_usuario || "Estudiante",
        nivel_educativo: profile.nivel_educativo || "",
        grado_actual: profile.grado_actual || "",
        institution: profile.institution || "",
        bio: profile.bio || "",
        custom_url: profile.custom_url || "",
        tipo_aprendizaje: profile.tipo_aprendizaje || "",
        nivel_motivacion: profile.nivel_motivacion?.toString() || "",
        preferencia_duracion_contenido: profile.preferencia_duracion_contenido || "",
        horario_preferido_estudio: profile.horario_preferido_estudio || "",
        modo_consumo_preferido: profile.modo_consumo_preferido || "",
        frecuencia_estudio: profile.frecuencia_estudio || "",
        nivel_autonomia: profile.nivel_autonomia || "",
        dificultades_aprendizaje: profile.dificultades_aprendizaje || "",
        idioma_contenido_preferido: profile.idioma_contenido_preferido || "Español",
        areas_interes: profile.areas_interes || [],
        temas_favoritos: profile.temas_favoritos || [],
        profesiones_de_interes: profile.profesiones_de_interes || [],
        habilidades_a_desarrollar: profile.habilidades_a_desarrollar || [],
        motivaciones_principales: profile.motivaciones_principales || "",
        nivel_meta_aprendizaje: profile.nivel_meta_aprendizaje || "",
      });
      
      // Cargar datos complejos
      const workExp = Array.isArray(profile.work_experience) ? profile.work_experience : [];
      const skillsData = Array.isArray(profile.skills) ? profile.skills : [];
      const formalEdu = Array.isArray((profile as any).education) ? (profile as any).education : [];
      const complementaryEdu = Array.isArray(profile.complementary_education) ? profile.complementary_education : [];
      const projectsData = Array.isArray((profile as any).projects) ? (profile as any).projects : [];
      const awardsData = Array.isArray((profile as any).awards) ? (profile as any).awards : [];
      const social = typeof profile.social_links === 'object' && profile.social_links !== null
          ? profile.social_links
          : { linkedin: "", instagram: "", facebook: "", twitter: "", tiktok: "", github: "" };
      
      setWorkExperience(workExp);
      setSkills(skillsData);
      setFormalEducation(formalEdu);
      setComplementaryEducation(complementaryEdu);
      setProjects(projectsData);
      setAwards(awardsData);
      setSocialLinks(social);
      
      // Guardar estado inicial
      previousStateRef.current = {
        workExperience: workExp,
        skills: skillsData,
        formalEducation: formalEdu,
        complementaryEducation: complementaryEdu,
        projects: projectsData,
        awards: awardsData,
        socialLinks: social,
      };
    }
  }, [profile]);

  // Función de autoguardado
  const autoSave = useCallback(async () => {
    if (!previousStateRef.current) return;
    
    setSaving(true);
    
    const updates: any = {
      full_name: formData.full_name || null,
      tipo_documento: formData.tipo_documento || null,
      numero_documento: formData.numero_documento || null,
      fecha_nacimiento: formData.fecha_nacimiento || null,
      genero: formData.genero || null,
      pais: formData.pais || null,
      departamento: formData.departamento || null,
      municipio: formData.municipio || null,
      phone: formData.phone || null,
      idioma_preferido: formData.idioma_preferido || "Español",
      tipo_usuario: formData.tipo_usuario || "Estudiante",
      nivel_educativo: formData.nivel_educativo || null,
      grado_actual: formData.grado_actual || null,
      institution: formData.institution || null,
      bio: formData.bio || null,
      custom_url: formData.custom_url || null,
      tipo_aprendizaje: formData.tipo_aprendizaje || null,
      nivel_motivacion: formData.nivel_motivacion ? parseInt(formData.nivel_motivacion) : null,
      preferencia_duracion_contenido: formData.preferencia_duracion_contenido || null,
      horario_preferido_estudio: formData.horario_preferido_estudio || null,
      modo_consumo_preferido: formData.modo_consumo_preferido || null,
      frecuencia_estudio: formData.frecuencia_estudio || null,
      nivel_autonomia: formData.nivel_autonomia || null,
      dificultades_aprendizaje: formData.dificultades_aprendizaje || null,
      idioma_contenido_preferido: formData.idioma_contenido_preferido || "Español",
      areas_interes: formData.areas_interes.length > 0 ? formData.areas_interes : null,
      temas_favoritos: formData.temas_favoritos.length > 0 ? formData.temas_favoritos : null,
      profesiones_de_interes: formData.profesiones_de_interes.length > 0 ? formData.profesiones_de_interes : null,
      habilidades_a_desarrollar: formData.habilidades_a_desarrollar.length > 0 ? formData.habilidades_a_desarrollar : null,
      motivaciones_principales: formData.motivaciones_principales || null,
      nivel_meta_aprendizaje: formData.nivel_meta_aprendizaje || null,
      // Agregar datos complejos
      work_experience: workExperience,
      skills: skills,
      education: formalEducation,
      complementary_education: complementaryEducation,
      projects: projects,
      awards: awards,
      social_links: socialLinks,
    };

    try {
      // Track previous state for XP awards desde previousStateRef
      const previousSocialLinks = previousStateRef.current?.socialLinks || {};
      const previousEducation = previousStateRef.current?.formalEducation || [];
      const previousComplementaryEducation = previousStateRef.current?.complementaryEducation || [];
      const previousWorkExperience = previousStateRef.current?.workExperience || [];
      const previousSkills = previousStateRef.current?.skills || [];

      await updateProfile(updates);

      // Award XP for new additions
      // Social links - award for each new link
      const socialLinksPromises = Object.keys(socialLinks).map(async (key) => {
        const hasValue = socialLinks[key] && socialLinks[key].trim() !== '';
        const hadValue = previousSocialLinks[key] && previousSocialLinks[key].trim() !== '';
        if (hasValue && !hadValue) {
          await awardProfileXP('social_link_added', 200, true);
        }
      });
      await Promise.all(socialLinksPromises);

      // Education - award for each new item
      const newEducationCount = formalEducation.length - (Array.isArray(previousEducation) ? previousEducation.length : 0);
      for (let i = 0; i < newEducationCount; i++) {
        await awardProfileXP('formal_education_added', 200, true);
      }

      // Complementary education - award for each new item
      const newComplementaryCount = complementaryEducation.length - (Array.isArray(previousComplementaryEducation) ? previousComplementaryEducation.length : 0);
      for (let i = 0; i < newComplementaryCount; i++) {
        await awardProfileXP('complementary_education_added', 200, true);
      }

      // Work experience - award for each new item
      const newWorkExpCount = workExperience.length - (Array.isArray(previousWorkExperience) ? previousWorkExperience.length : 0);
      for (let i = 0; i < newWorkExpCount; i++) {
        await awardProfileXP('work_experience_added', 200, true);
      }

      // Skills - award for each new skill
      const prevTechnicalSkills = Array.isArray(previousSkills) ? previousSkills.filter((s: any) => s.type === 'technical') : [];
      const prevSoftSkills = Array.isArray(previousSkills) ? previousSkills.filter((s: any) => s.type === 'soft') : [];
      const newTechnicalSkills = skills.filter(s => s.type === 'technical');
      const newSoftSkills = skills.filter(s => s.type === 'soft');

      const newTechCount = newTechnicalSkills.length - prevTechnicalSkills.length;
      const newSoftCount = newSoftSkills.length - prevSoftSkills.length;

      for (let i = 0; i < newTechCount; i++) {
        await awardProfileXP('technical_skill_added', 200, true);
      }
      for (let i = 0; i < newSoftCount; i++) {
        await awardProfileXP('soft_skill_added', 200, true);
      }

      // Check if profile 360 is complete - only award once
      const isProfile360Complete = 
        formData.full_name &&
        formData.bio &&
        Object.values(socialLinks).some(link => link) &&
        formalEducation.length > 0 &&
        complementaryEducation.length > 0 &&
        workExperience.length > 0 &&
        skills.length > 0 &&
        projects.length > 0 &&
        awards.length > 0;

      if (isProfile360Complete && !profile?.perfil_completo_360) {
        await updateProfile({ perfil_completo_360: true });
        await awardProfileXP('profile_360_complete', 1000, false);
      }

      setLastSaved(new Date());
      setSaving(false);
      
      // Actualizar estado previo después de guardar exitosamente
      previousStateRef.current = {
        workExperience: [...workExperience],
        skills: [...skills],
        formalEducation: [...formalEducation],
        complementaryEducation: [...complementaryEducation],
        projects: [...projects],
        awards: [...awards],
        socialLinks: {...socialLinks},
      };
    } catch (error: any) {
      setSaving(false);
      console.error('Error al guardar perfil:', error);
    }
  }, [formData, workExperience, skills, formalEducation, complementaryEducation, socialLinks, profile, updateProfile, awardProfileXP]);

  // Efecto para autoguardado con debouncing
  useEffect(() => {
    if (!profile || !previousStateRef.current) return;

    // Limpiar timeout previo
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Programar autoguardado después de 2 segundos sin cambios
    saveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, workExperience, skills, formalEducation, complementaryEducation, projects, awards, socialLinks, autoSave, profile]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20 md:pt-0">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4 animate-pulse">📚</div>
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-20 md:pt-0">
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
    <>
      <Sidebar />
      <div className="min-h-screen bg-background pb-20 md:ml-64 pt-20 md:pt-0">
        <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold">Editar Perfil 360°</h1>
            </div>
            <div className="flex items-center gap-2">
              {saving && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Save className="w-4 h-4 animate-pulse" />
                  Guardando...
                </span>
              )}
              {!saving && lastSaved && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Guardado
                </span>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="space-y-6">
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
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">El correo no puede ser modificado</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
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

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono (Opcional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+57 300 123 4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom_url">URL Personalizada</Label>
                  <Input
                    id="custom_url"
                    value={formData.custom_url}
                    onChange={(e) => setFormData({ ...formData, custom_url: e.target.value })}
                    placeholder="tu-nombre"
                  />
                  <p className="text-xs text-muted-foreground">sedetok.app/u/tu-nombre</p>
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

          {/* Redes Sociales */}
          <SocialLinksEditor 
            socialLinks={socialLinks}
            onChange={setSocialLinks}
          />

          {/* Educación Formal */}
          <FormalEducationEditor 
            education={formalEducation}
            onChange={setFormalEducation}
          />

          {/* Formación Complementaria */}
          <EducationEditor 
            education={complementaryEducation}
            onChange={setComplementaryEducation}
          />

          {/* Experiencia Laboral */}
          <ExperienceEditor 
            experiences={workExperience}
            onChange={setWorkExperience}
          />

          {/* Habilidades */}
          <SkillsEditor 
            skills={skills}
            onChange={setSkills}
          />

          {/* Proyectos */}
          <Card>
            <CardHeader>
              <CardTitle>Proyectos</CardTitle>
              <CardDescription>Agrega los proyectos en los que has trabajado</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectsEditor 
                projects={projects}
                onChange={setProjects}
              />
            </CardContent>
          </Card>

          {/* Premios y Reconocimientos */}
          <Card>
            <CardHeader>
              <CardTitle>Premios y Reconocimientos</CardTitle>
              <CardDescription>Agrega los premios y reconocimientos que has recibido</CardDescription>
            </CardHeader>
            <CardContent>
              <AwardsEditor 
                awards={awards}
                onChange={setAwards}
              />
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
                      <SelectValue placeholder="Selecciona tu tipo de aprendizaje" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lingüístico-Verbal">🗣️ Lingüístico-Verbal</SelectItem>
                      <SelectItem value="Lógico-Matemática">🔢 Lógico-Matemática</SelectItem>
                      <SelectItem value="Visual-Espacial">🎨 Visual-Espacial</SelectItem>
                      <SelectItem value="Musical">🎵 Musical</SelectItem>
                      <SelectItem value="Corporal-Kinestésica">🤸 Corporal-Kinestésica</SelectItem>
                      <SelectItem value="Interpersonal">👥 Interpersonal</SelectItem>
                      <SelectItem value="Intrapersonal">🧘 Intrapersonal</SelectItem>
                      <SelectItem value="Naturalista">🌿 Naturalista</SelectItem>
                      <SelectItem value="Existencial">🤔 Existencial</SelectItem>
                      <SelectItem value="Creativa-Innovadora">💡 Creativa-Innovadora</SelectItem>
                      <SelectItem value="Digital-Tecnológica">💻 Digital-Tecnológica</SelectItem>
                      <SelectItem value="Emocional">❤️ Emocional</SelectItem>
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
                <TagInput
                  value={formData.areas_interes}
                  onChange={(tags) => setFormData({ ...formData, areas_interes: tags })}
                  placeholder="Escribe y presiona Enter para agregar (Ej: Matemáticas, Ciencias, Historia)"
                  fieldName="areas_interes"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="temas_favoritos">Temas Favoritos</Label>
                <TagInput
                  value={formData.temas_favoritos}
                  onChange={(tags) => setFormData({ ...formData, temas_favoritos: tags })}
                  placeholder="Escribe y presiona Enter para agregar (Ej: Geometría, Física cuántica)"
                  fieldName="temas_favoritos"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profesiones_de_interes">Profesiones de Interés</Label>
                <TagInput
                  value={formData.profesiones_de_interes}
                  onChange={(tags) => setFormData({ ...formData, profesiones_de_interes: tags })}
                  placeholder="Escribe y presiona Enter para agregar (Ej: Ingeniero, Médico)"
                  fieldName="profesiones_de_interes"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="habilidades_a_desarrollar">Habilidades a Desarrollar</Label>
                <TagInput
                  value={formData.habilidades_a_desarrollar}
                  onChange={(tags) => setFormData({ ...formData, habilidades_a_desarrollar: tags })}
                  placeholder="Ej: Pensamiento crítico, Trabajo en equipo, Programación"
                  fieldName="habilidades_a_desarrollar"
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

          <div className="flex gap-3 justify-end items-center">
            <p className="text-sm text-muted-foreground">
              Los cambios se guardan automáticamente
            </p>
            <Button type="button" variant="outline" onClick={() => navigate("/profile")}>
              Volver al Perfil
            </Button>
          </div>
          </div>
        </main>
    </div>
    </>
  );
};

export default EditProfile;
