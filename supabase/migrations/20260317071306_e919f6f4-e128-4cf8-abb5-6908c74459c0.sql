
CREATE TABLE public.student_study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  institution_nit text,
  document_number text,
  academic_year text NOT NULL,
  grade text NOT NULL,
  periodos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, academic_year)
);

ALTER TABLE public.student_study_plans ENABLE ROW LEVEL SECURITY;

-- Students can read their own plan
CREATE POLICY "Users can view own study plan"
  ON public.student_study_plans FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Institution staff can view plans of their students
CREATE POLICY "Institution staff can view student plans"
  ON public.student_study_plans FOR SELECT
  TO authenticated
  USING (
    institution_id IS NOT NULL 
    AND public.is_institution_staff(auth.uid(), institution_id)
  );

-- Only service role / webhooks insert/update (no authenticated insert policy needed)
CREATE POLICY "Service role manages study plans"
  ON public.student_study_plans FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at
CREATE TRIGGER update_study_plans_updated_at
  BEFORE UPDATE ON public.student_study_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
