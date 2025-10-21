import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCloudinary } from "@/hooks/useCloudinary";
import { Settings, Upload, RefreshCw, Building2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Institution {
  id: string;
  name: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  country?: string;
  nit?: string;
  codigo_dane?: string;
  logo_url?: string;
  sede_academico_api_url?: string;
}

interface InstitutionSettingsProps {
  institutionId: string;
  institution: Institution;
}

export function InstitutionSettings({ 
  institutionId, 
  institution 
}: InstitutionSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { uploadFile, uploading } = useCloudinary();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: institution.name || "",
    description: institution.description || "",
    contact_email: institution.contact_email || "",
    contact_phone: institution.contact_phone || "",
    address: institution.address || "",
    city: institution.city || "",
    country: institution.country || "",
    nit: institution.nit || "",
    codigo_dane: institution.codigo_dane || "",
    logo_url: institution.logo_url || "",
    sede_academico_api_url: institution.sede_academico_api_url || ""
  });

  const updateSettings = useMutation({
    mutationFn: async (data: Partial<Institution>) => {
      const { error } = await supabase
        .from("institutions")
        .update(data)
        .eq("id", institutionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["institution", institutionId] });
      toast({
        title: "Configuración actualizada",
        description: "Los cambios se guardaron correctamente"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo de imagen",
        variant: "destructive"
      });
      return;
    }

    try {
      const url = await uploadFile(file, "raw");
      setFormData(prev => ({ ...prev, logo_url: url }));
      toast({
        title: "Logo subido",
        description: "El logo se subió correctamente"
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
    }
  };

  const syncWithSedeAcademico = useMutation({
    mutationFn: async () => {
      if (!formData.sede_academico_api_url) {
        throw new Error("Debe configurar la URL de Sede Académico primero");
      }

      const { data, error } = await supabase.functions.invoke("sync-sede-academico", {
        body: { institutionId, apiUrl: formData.sede_academico_api_url }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await supabase
        .from("institutions")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", institutionId);

      queryClient.invalidateQueries({ queryKey: ["institution-members"] });
      toast({
        title: "Sincronización exitosa",
        description: `Se sincronizaron ${data?.synced || 0} usuarios correctamente`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error en sincronización",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSaveGeneralSettings = () => {
    updateSettings.mutate({
      name: formData.name,
      description: formData.description || undefined,
      contact_email: formData.contact_email || undefined,
      contact_phone: formData.contact_phone || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
      country: formData.country || undefined,
      nit: formData.nit || undefined,
      codigo_dane: formData.codigo_dane || undefined,
      logo_url: formData.logo_url || undefined
    });
  };

  const handleSaveApiUrl = () => {
    updateSettings.mutate({
      sede_academico_api_url: formData.sede_academico_api_url || undefined
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Información General
          </CardTitle>
          <CardDescription>Datos básicos de la institución</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Nombre de la Institución *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre completo de la institución"
                required
              />
            </div>

            <div>
              <Label htmlFor="nit">NIT</Label>
              <Input
                id="nit"
                value={formData.nit}
                onChange={(e) => setFormData(prev => ({ ...prev, nit: e.target.value }))}
                placeholder="Número de Identificación Tributaria"
              />
            </div>

            <div>
              <Label htmlFor="codigo_dane">Código DANE</Label>
              <Input
                id="codigo_dane"
                value={formData.codigo_dane}
                onChange={(e) => setFormData(prev => ({ ...prev, codigo_dane: e.target.value }))}
                placeholder="Código del DANE"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción de la institución"
                rows={3}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="logo">Logo de la Institución</Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button 
                type="button"
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Subiendo..." : "Subir Logo"}
              </Button>
              {formData.logo_url && (
                <div className="flex items-center gap-2">
                  <img src={formData.logo_url} alt="Logo" className="h-12 object-contain" />
                </div>
              )}
            </div>
          </div>

          <Button onClick={handleSaveGeneralSettings} disabled={updateSettings.isPending || !formData.name}>
            Guardar Información General
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Información de Contacto
          </CardTitle>
          <CardDescription>Datos de contacto y ubicación</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_email">Email de Contacto</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                placeholder="contacto@institucion.edu.co"
              />
            </div>

            <div>
              <Label htmlFor="contact_phone">Teléfono de Contacto</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                placeholder="+57 300 123 4567"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Dirección completa"
              />
            </div>

            <div>
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Ciudad"
              />
            </div>

            <div>
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                placeholder="País"
              />
            </div>
          </div>

          <Button onClick={handleSaveGeneralSettings} disabled={updateSettings.isPending}>
            Guardar Información de Contacto
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integración con Sede Académico</CardTitle>
          <CardDescription>
            Sincroniza estudiantes, profesores y padres de familia
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="api-url">URL de Sede Académico</Label>
            <Input
              id="api-url"
              value={formData.sede_academico_api_url}
              onChange={(e) => setFormData(prev => ({ ...prev, sede_academico_api_url: e.target.value }))}
              placeholder="https://api.sedeacademico.com"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSaveApiUrl}
              variant="outline"
              disabled={updateSettings.isPending}
            >
              Guardar URL
            </Button>
            <Button
              onClick={() => syncWithSedeAcademico.mutate()}
              disabled={!formData.sede_academico_api_url || syncWithSedeAcademico.isPending}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncWithSedeAcademico.isPending ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
