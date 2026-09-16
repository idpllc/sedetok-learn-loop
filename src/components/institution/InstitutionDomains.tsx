import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Loader2, Plus, Trash2 } from "lucide-react";

interface Props {
  institutionId: string;
}

const cleanDomain = (value: string) => {
  const raw = value.trim().toLowerCase();
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export function InstitutionDomains({ institutionId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [domain, setDomain] = useState("");

  const list = useQuery({
    queryKey: ["institution-domains", institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institution_domains" as any)
        .select("*")
        .eq("institution_id", institutionId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const add = useMutation({
    mutationFn: async (value: string) => {
      const host = cleanDomain(value);
      if (!host) throw new Error("Dominio inválido");
      const { error } = await supabase
        .from("institution_domains" as any)
        .insert({ institution_id: institutionId, domain: host });
      if (error) throw error;
    },
    onSuccess: () => {
      setDomain("");
      qc.invalidateQueries({ queryKey: ["institution-domains", institutionId] });
      toast({ title: "Dominio agregado" });
    },
    onError: (e: any) =>
      toast({ title: "No se pudo agregar", description: e.message, variant: "destructive" }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("institution_domains" as any)
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["institution-domains", institutionId] }),
  });

  const saveWebhook = useMutation({
    mutationFn: async ({ id, webhook_url, webhook_secret }: { id: string; webhook_url: string; webhook_secret: string }) => {
      const { error } = await supabase
        .from("institution_domains" as any)
        .update({ webhook_url: webhook_url.trim() || null, webhook_secret: webhook_secret.trim() || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["institution-domains", institutionId] });
      toast({ title: "Aviso automático guardado" });
    },
    onError: (e: any) =>
      toast({ title: "No se pudo guardar", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("institution_domains" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["institution-domains", institutionId] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" /> Sitios web autorizados
        </CardTitle>
        <CardDescription>
          Registra los sitios desde los que tus usuarios pagan. Al terminar el pago volverán a ese
          sitio con sus créditos ya recargados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (domain.trim()) add.mutate(domain);
          }}
        >
          <Input
            placeholder="colegio.edu.co"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <Button type="submit" disabled={add.isPending || !domain.trim()} className="gap-2">
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Agregar
          </Button>
        </form>

        {list.isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (list.data?.length || 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay sitios registrados.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {list.data?.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 p-3">
                <span className="truncate text-sm font-medium">{d.domain}</span>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={d.is_active}
                    onCheckedChange={(v) => toggle.mutate({ id: d.id, is_active: v })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`¿Eliminar ${d.domain}?`)) remove.mutate(d.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
