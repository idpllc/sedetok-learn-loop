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
  const { data: profile } = useQuery({
    queryKey: ['profile-document', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('numero_documento')
        .eq('id', user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: studyPlans, isLoading, error } = useQuery({
    queryKey: ['study-plans', user?.id, profile?.numero_documento],
    queryFn: async () => {
      // Query by user_id OR by document_number matching the profile's numero_documento
      let query = supabase
        .from('student_study_plans')
        .select('*')
        .order('academic_year', { ascending: false });

      if (profile?.numero_documento) {
        // Use OR filter: user_id matches OR document_number matches
        query = query.or(`user_id.eq.${user!.id},document_number.eq.${profile.numero_documento}`);
      } else {
        query = query.eq('user_id', user!.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return (data || []).map((plan: any) => ({
        ...plan,
        periodos: (plan.periodos || []) as Periodo[],
      })) as StudyPlan[];
    },
    enabled: !!user && profile !== undefined,
  });

  return { studyPlans, isLoading, error };
};
