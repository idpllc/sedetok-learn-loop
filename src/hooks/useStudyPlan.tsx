import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Evaluacion {
  descripcion: string;
  nota: number | null;
}

export interface Competencia {
  nombre_competencia: string;
  calificacion_competencia: number | null;
  evaluaciones: Evaluacion[];
}

export interface Asignatura {
  nombre_asignatura: string;
  nota_final_asignatura: number | null;
  competencias: Competencia[];
}

export interface Periodo {
  periodo_nombre: string;
  asignaturas: Asignatura[];
}

export interface StudyPlan {
  id: string;
  user_id: string;
  institution_id: string | null;
  institution_nit: string | null;
  document_number: string | null;
  academic_year: string;
  grade: string;
  periodos: Periodo[];
  created_at: string;
  updated_at: string;
}

export const useStudyPlan = () => {
  const { user } = useAuth();

  // First get the user's document number from their profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile-document', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('numero_documento')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) {
        console.error('[useStudyPlan] profile fetch error', error);
      }
      return data ?? { numero_documento: null };
    },
    enabled: !!user,
  });

  const documentNumber = profile?.numero_documento ?? null;

  const { data: studyPlans, isLoading, error } = useQuery({
    queryKey: ['study-plans', user?.id, documentNumber],
    queryFn: async () => {
      // Fetch by user_id
      const byUserPromise = supabase
        .from('student_study_plans')
        .select('*')
        .eq('user_id', user!.id);

      // Fetch by document_number (if available) — runs as separate query to avoid
      // any URL-encoding pitfalls with .or() and special chars in document numbers.
      const byDocPromise = documentNumber
        ? supabase
            .from('student_study_plans')
            .select('*')
            .eq('document_number', documentNumber)
        : Promise.resolve({ data: [], error: null } as any);

      const [byUserRes, byDocRes] = await Promise.all([byUserPromise, byDocPromise]);

      if (byUserRes.error) {
        console.error('[useStudyPlan] error by user_id', byUserRes.error);
        throw byUserRes.error;
      }
      if (byDocRes.error) {
        console.error('[useStudyPlan] error by document_number', byDocRes.error);
      }

      // Merge & dedupe by id
      const merged = new Map<string, any>();
      [...(byUserRes.data || []), ...(byDocRes.data || [])].forEach((p) => {
        merged.set(p.id, p);
      });

      const all = Array.from(merged.values()).sort((a, b) =>
        String(b.academic_year).localeCompare(String(a.academic_year))
      );

      console.log('[useStudyPlan] loaded plans:', {
        userId: user!.id,
        documentNumber,
        byUserCount: byUserRes.data?.length ?? 0,
        byDocCount: byDocRes.data?.length ?? 0,
        total: all.length,
      });

      return all.map((plan: any) => ({
        ...plan,
        periodos: (plan.periodos || []) as Periodo[],
      })) as StudyPlan[];
    },
    enabled: !!user && !profileLoading,
  });

  return { studyPlans, isLoading: isLoading || profileLoading, error, documentNumber };
};
