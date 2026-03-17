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

  const { data: studyPlans, isLoading, error } = useQuery({
    queryKey: ['study-plans', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_study_plans')
        .select('*')
        .eq('user_id', user!.id)
        .order('academic_year', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((plan: any) => ({
        ...plan,
        periodos: (plan.periodos || []) as Periodo[],
      })) as StudyPlan[];
    },
    enabled: !!user,
  });

  return { studyPlans, isLoading, error };
};
