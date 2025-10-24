import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, FileEdit, Loader2, ArrowLeft } from "lucide-react";
import { useCVVariations } from "@/hooks/useCVVariations";
import { BuyEducoinsModal } from "@/components/BuyEducoinsModal";

interface CreateCVVariationProps {
  profile: any;
  variation?: any;
  onBack: () => void;
  onSuccess: () => void;
}

export const CreateCVVariation = ({ profile, variation, onBack, onSuccess }: CreateCVVariationProps) => {
  const { createVariation, updateVariation, generateWithAI, showBuyModal, requiredAmount, closeBuyModal } = useCVVariations(profile?.id);
  const [mode, setMode] = useState<"manual" | "ai">(variation?.created_with_ai ? "ai" : "manual");
  const [generating, setGenerating] = useState(false);
  const isEditing = !!variation;

  const [formData, setFormData] = useState({
    title: variation?.title || "",
    target_position: variation?.target_position || "",
    company_name: variation?.company_name || "",
    job_description: variation?.job_description || "",
    custom_bio: variation?.custom_bio || "",
    highlighted_skills: variation?.highlighted_skills || [] as string[],
    highlighted_experience: variation?.highlighted_experience || [] as string[],
    highlighted_projects: variation?.highlighted_projects || [] as string[],
  });

  const [aiData, setAiData] = useState<any>(null);

  const handleGenerateWithAI = async () => {
    if (!formData.target_position) {
      return;
    }

    setGenerating(true);
    try {
      const result = await generateWithAI.mutateAsync({
        profile,
        targetPosition: formData.target_position,
        companyName: formData.company_name,
        jobDescription: formData.job_description,
      });
      
      setAiData(result);
      setFormData(prev => ({
        ...prev,
        custom_bio: result.custom_bio || prev.custom_bio,
        highlighted_skills: result.highlighted_skills || prev.highlighted_skills,
        highlighted_experience: result.highlighted_experience || prev.highlighted_experience,
        highlighted_projects: result.highlighted_projects || prev.highlighted_projects,
      }));
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    const data = {
      title: formData.title || `CV para ${formData.target_position}`,
      target_position: formData.target_position,
      company_name: formData.company_name,
      job_description: formData.job_description,
      custom_bio: formData.custom_bio,
      highlighted_skills: formData.highlighted_skills,
      highlighted_experience: formData.highlighted_experience,
      highlighted_projects: formData.highlighted_projects,
      created_with_ai: mode === "ai",
      ai_prompt: mode === "ai" ? formData.job_description : null,
    };

    if (isEditing) {
      await updateVariation.mutateAsync({ id: variation.id, updates: data });
    } else {
      await createVariation.mutateAsync(data);
    }
    onSuccess();
  };

  return (
    <>
      <BuyEducoinsModal
        open={showBuyModal}
        onOpenChange={(open) => !open && closeBuyModal()}
        requiredAmount={requiredAmount}
      />
      
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{isEditing ? 'Editar Variación de CV' : 'Nueva Variación de CV'}</h2>
            <p className="text-sm text-muted-foreground">
              Personaliza tu hoja de vida para una posición específica
            </p>
          </div>
        </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as "manual" | "ai")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai">
            <Sparkles className="w-4 h-4 mr-2" />
            Generar con IA
          </TabsTrigger>
          <TabsTrigger value="manual">
            <FileEdit className="w-4 h-4 mr-2" />
            Crear Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información del Cargo</CardTitle>
              <CardDescription>
                La IA analizará esta información para optimizar tu CV
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target_position">Cargo Objetivo *</Label>
                <Input
                  id="target_position"
                  value={formData.target_position}
                  onChange={(e) => setFormData({ ...formData, target_position: e.target.value })}
                  placeholder="Ej: Desarrollador Full Stack Senior"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Empresa (Opcional)</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Nombre de la empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job_description">Descripción del Puesto</Label>
                <Textarea
                  id="job_description"
                  value={formData.job_description}
                  onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                  placeholder="Pega aquí la descripción completa del puesto..."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Mientras más detallada sea la descripción, mejor será la optimización
                </p>
              </div>

              <Button
                onClick={handleGenerateWithAI}
                disabled={!formData.target_position || generating}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generando con IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generar Variación con IA (20 educoins)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {aiData && (
            <Card>
              <CardHeader>
                <CardTitle>Resultados Generados por IA</CardTitle>
                <CardDescription>Revisa y ajusta antes de guardar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título de la Variación</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={`CV para ${formData.target_position}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Biografía Optimizada</Label>
                  <Textarea
                    value={formData.custom_bio}
                    onChange={(e) => setFormData({ ...formData, custom_bio: e.target.value })}
                    rows={3}
                  />
                </div>

                {aiData.key_achievements && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <h4 className="font-semibold text-sm">Logros Destacados:</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {aiData.key_achievements.map((achievement: string, i: number) => (
                        <li key={i}>{achievement}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiData.recommendations && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">💡 Recomendaciones:</h4>
                    <p className="text-sm">{aiData.recommendations}</p>
                  </div>
                )}

                <Button onClick={handleSave} className="w-full" disabled={createVariation.isPending || updateVariation.isPending}>
                  {(createVariation.isPending || updateVariation.isPending) ? "Guardando..." : isEditing ? "Actualizar Variación" : "Guardar Variación"}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Crear Variación Manual</CardTitle>
              <CardDescription>
                Personaliza cada aspecto de tu CV manualmente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual_title">Título de la Variación *</Label>
                <Input
                  id="manual_title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej: CV para Google - SWE"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual_position">Cargo Objetivo *</Label>
                <Input
                  id="manual_position"
                  value={formData.target_position}
                  onChange={(e) => setFormData({ ...formData, target_position: e.target.value })}
                  placeholder="Ej: Software Engineer"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual_company">Empresa (Opcional)</Label>
                <Input
                  id="manual_company"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Nombre de la empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual_bio">Biografía Personalizada</Label>
                <Textarea
                  id="manual_bio"
                  value={formData.custom_bio}
                  onChange={(e) => setFormData({ ...formData, custom_bio: e.target.value })}
                  placeholder="Escribe una biografía enfocada en este cargo..."
                  rows={4}
                />
              </div>

              <Button
                onClick={handleSave}
                className="w-full"
                disabled={!formData.title || !formData.target_position || createVariation.isPending || updateVariation.isPending}
              >
                {(createVariation.isPending || updateVariation.isPending) ? "Guardando..." : isEditing ? "Actualizar Variación" : "Crear Variación"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
};