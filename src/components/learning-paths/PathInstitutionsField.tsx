import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Building2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PathInstitutionsFieldProps {
  pathId: string | null;
  value: string[];
  onChange: (institutions: string[]) => void;
}

/**
 * Allows the creator (if admin/teacher of any institution) to associate the path
 * with one or more institutions. Members of those institutions will be able to
 * see the path even if it is not public.
 */
export const PathInstitutionsField = ({ pathId, value, onChange }: PathInstitutionsFieldProps) => {
  const { data: institutions, isLoading } = useQuery({
    queryKey: ["user-staff-institutions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("institution_members")
        .select("institution_id, institutions(id, name, logo_url)")
        .eq("user_id", user.id)
        .in("member_role", ["admin", "teacher"])
        .eq("status", "active");
      if (error) throw error;
      return (data || [])
        .map((row: any) => row.institutions)
        .filter((i: any) => i);
    },
  });

  // Hydrate initial selection from DB once the path exists
  const { data: linked } = useQuery({
    queryKey: ["path-institutions", pathId],
    queryFn: async () => {
      if (!pathId) return [];
      const { data, error } = await (supabase as any)
        .from("learning_path_institutions")
        .select("institution_id")
        .eq("path_id", pathId);
      if (error) throw error;
      return (data || []).map((r: any) => r.institution_id);
    },
    enabled: !!pathId,
  });

  useEffect(() => {
    if (linked && linked.length > 0 && value.length === 0) {
      onChange(linked);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked?.join(",")]);

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Instituciones asociadas</Label>
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!institutions || institutions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label>Instituciones asociadas</Label>
      <p className="text-sm text-muted-foreground">
        Los miembros activos de estas instituciones podrán ver la ruta aunque no sea pública.
      </p>
      <ScrollArea className="max-h-[260px] border rounded-lg">
        <div className="p-2 space-y-2">
          {institutions.map((inst: any) => {
            const selected = value.includes(inst.id);
            return (
              <button
                type="button"
                key={inst.id}
                onClick={() => toggle(inst.id)}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {inst.logo_url ? (
                    <img
                      src={inst.logo_url}
                      alt={inst.name}
                      className="w-9 h-9 rounded object-cover"
                      loading="lazy"
                      width={36}
                      height={36}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded bg-muted flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <span className="flex-1 font-medium">{inst.name}</span>
                  {selected && <Check className="w-4 h-4 text-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((id) => {
            const inst = institutions.find((i: any) => i.id === id);
            return inst ? (
              <Badge key={id} variant="secondary">
                {inst.name}
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
};
