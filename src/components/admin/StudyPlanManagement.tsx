import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, GraduationCap, Building2, Calendar, FileText } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface StudyPlanRow {
  id: string;
  user_id: string;
  institution_id: string | null;
  institution_nit: string | null;
  document_number: string | null;
  academic_year: string;
  grade: string;
  periodos: any[];
  created_at: string;
  updated_at: string;
}

export const StudyPlanManagement = () => {
  const [search, setSearch] = useState("");

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin-study-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_study_plans")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as StudyPlanRow[];
    },
  });

  // Fetch profiles and institutions for display names
  const userIds = [...new Set(plans?.map((p) => p.user_id) || [])];
  const institutionIds = [...new Set(plans?.map((p) => p.institution_id).filter(Boolean) || [])] as string[];

  const { data: profiles } = useQuery({
    queryKey: ["admin-study-plan-profiles", userIds],
    queryFn: async () => {
      if (!userIds.length) return {};
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, numero_documento")
        .in("id", userIds);
      const map: Record<string, any> = {};
      data?.forEach((p) => (map[p.id] = p));
      return map;
    },
    enabled: userIds.length > 0,
  });

  const { data: institutions } = useQuery({
    queryKey: ["admin-study-plan-institutions", institutionIds],
    queryFn: async () => {
      if (!institutionIds.length) return {};
      const { data } = await supabase
        .from("institutions")
        .select("id, name, nit")
        .in("id", institutionIds);
      const map: Record<string, any> = {};
      data?.forEach((i) => (map[i.id] = i));
      return map;
    },
    enabled: institutionIds.length > 0,
  });

  const filtered = plans?.filter((plan) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const profile = profiles?.[plan.user_id];
    return (
      plan.document_number?.toLowerCase().includes(s) ||
      plan.grade?.toLowerCase().includes(s) ||
      plan.academic_year?.toLowerCase().includes(s) ||
      plan.institution_nit?.toLowerCase().includes(s) ||
      profile?.username?.toLowerCase().includes(s) ||
      profile?.full_name?.toLowerCase().includes(s) ||
      (institutions?.[plan.institution_id || ""]?.name || "").toLowerCase().includes(s)
    );
  });

  const totalAsignaturas = (plan: StudyPlanRow) =>
    (plan.periodos || []).reduce((sum: number, p: any) => sum + (p.asignaturas?.length || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          Planes de Estudio
        </CardTitle>
        <CardDescription>
          {plans?.length || 0} planes cargados en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por documento, estudiante, institución, grado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !filtered?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron planes de estudio
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Institución</TableHead>
                  <TableHead>Año</TableHead>
                  <TableHead>Grado</TableHead>
                  <TableHead>Periodos</TableHead>
                  <TableHead>Asignaturas</TableHead>
                  <TableHead>Actualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((plan) => {
                  const profile = profiles?.[plan.user_id];
                  const inst = institutions?.[plan.institution_id || ""];
                  return (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {profile?.full_name || profile?.username || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{profile?.username || "—"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {plan.document_number || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 max-w-[180px]">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">
                            {inst?.name || plan.institution_nit || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <Calendar className="w-3 h-3 mr-1" />
                          {plan.academic_year}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{plan.grade}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{(plan.periodos || []).length}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <FileText className="w-3 h-3 mr-1" />
                          {totalAsignaturas(plan)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(plan.updated_at).toLocaleDateString("es-CO", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
