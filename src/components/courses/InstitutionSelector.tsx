import { useState } from "react";
import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface InstitutionSelectorProps {
  selectedInstitutions: string[];
  onChange: (institutions: string[]) => void;
}

export const InstitutionSelector = ({
  selectedInstitutions,
  onChange,
}: InstitutionSelectorProps) => {
  const { data: institutions, isLoading } = useQuery({
    queryKey: ["user-institutions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get institutions where user is admin or teacher
      const { data, error } = await supabase
        .from("institution_members")
        .select(`
          institution_id,
          institutions (
            id,
            name,
            logo_url
          )
        `)
        .eq("user_id", user.id)
        .in("member_role", ["admin", "teacher"])
        .eq("status", "active");

      if (error) throw error;
      
      // Extract unique institutions
      const uniqueInstitutions = data
        ?.map(item => item.institutions)
        .filter((inst): inst is NonNullable<typeof inst> => inst !== null);

      return uniqueInstitutions || [];
    },
  });

  const handleToggle = (institutionId: string) => {
    if (selectedInstitutions.includes(institutionId)) {
      onChange(selectedInstitutions.filter(id => id !== institutionId));
    } else {
      onChange([...selectedInstitutions, institutionId]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Instituciones con acceso</Label>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!institutions || institutions.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Instituciones con acceso</Label>
        <div className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
          No tienes instituciones disponibles. Debes ser administrador o profesor de una institución para crear cursos privados.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Instituciones con acceso</Label>
      <p className="text-sm text-muted-foreground">
        Selecciona las instituciones que tendrán acceso a este curso privado
      </p>
      <ScrollArea className="h-[300px] border rounded-lg">
        <div className="p-2 space-y-2">
          {institutions.map((institution: any) => {
            const isSelected = selectedInstitutions.includes(institution.id);
            return (
              <div
                key={institution.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => handleToggle(institution.id)}
              >
                <div className="flex items-center gap-3">
                  {institution.logo_url && (
                    <img
                      src={institution.logo_url}
                      alt={institution.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{institution.name}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      {selectedInstitutions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedInstitutions.map(id => {
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
