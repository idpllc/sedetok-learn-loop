import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Upload, RefreshCw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface InstitutionSettingsProps {
  institutionId: string;
  currentLogoUrl?: string;
  currentApiUrl?: string;
}

export function InstitutionSettings({ 
  institutionId, 
  currentLogoUrl, 
  currentApiUrl 
}: InstitutionSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl || "");
  const [apiUrl, setApiUrl] = useState(currentApiUrl || "");

  const updateSettings = useMutation({
    mutationFn: async (data: { logo_url?: string; sede_academico_api_url?: string }) => {
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

  const syncWithSedeAcademico = useMutation({
    mutationFn: async () => {
      if (!apiUrl) {
        throw new Error("Debe configurar la URL de Sede Académico primero");
      }

      const { data, error } = await supabase.functions.invoke("sync-sede-academico", {
        body: { institutionId, apiUrl }
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

  const handleSaveSettings = () => {
    updateSettings.mutate({
      logo_url: logoUrl || undefined,
      sede_academico_api_url: apiUrl || undefined
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración General
          </CardTitle>
          <CardDescription>Personaliza tu institución</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="logo">Logo URL</Label>
            <div className="flex gap-2">
              <Input
                id="logo"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://ejemplo.com/logo.png"
              />
              <Button variant="outline" size="icon">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            {logoUrl && (
              <div className="mt-2">
                <img src={logoUrl} alt="Logo" className="h-16 object-contain" />
              </div>
            )}
          </div>

          <Button onClick={handleSaveSettings} disabled={updateSettings.isPending}>
            Guardar Configuración
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
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.sedeacademico.com"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSaveSettings}
              variant="outline"
              disabled={updateSettings.isPending}
            >
              Guardar URL
            </Button>
            <Button
              onClick={() => syncWithSedeAcademico.mutate()}
              disabled={!apiUrl || syncWithSedeAcademico.isPending}
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
