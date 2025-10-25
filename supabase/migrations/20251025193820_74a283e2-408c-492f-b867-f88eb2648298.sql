-- Create user_subject_results table for academic results from external systems (Sedefy Académico)
CREATE TABLE public.user_subject_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  area_academica TEXT NOT NULL,
  asignatura_nombre TEXT NOT NULL,
  asignatura_codigo TEXT,
  periodo_academico TEXT NOT NULL,
  score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL,
  passed BOOLEAN DEFAULT false,
  docente_nombre TEXT,
  observaciones TEXT,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_subject_results ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own results
CREATE POLICY "Users can view own subject results"
ON public.user_subject_results
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Institution teachers/admins can view results of their students
CREATE POLICY "Institution staff can view student results"
ON public.user_subject_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.institution_members im1
    JOIN public.institution_members im2 ON im1.institution_id = im2.institution_id
    WHERE im1.user_id = auth.uid()
      AND im2.user_id = user_subject_results.user_id
      AND im1.member_role IN ('admin', 'teacher')
      AND im1.status = 'active'
      AND im2.status = 'active'
  )
);

-- Policy: Service role can insert (for API endpoint)
CREATE POLICY "Service role can insert subject results"
ON public.user_subject_results
FOR INSERT
WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_user_subject_results_user_id ON public.user_subject_results(user_id);
CREATE INDEX idx_user_subject_results_institution_id ON public.user_subject_results(institution_id);
CREATE INDEX idx_user_subject_results_area ON public.user_subject_results(area_academica);
CREATE INDEX idx_user_subject_results_completed_at ON public.user_subject_results(completed_at);

-- Create updated_at trigger
CREATE TRIGGER update_user_subject_results_updated_at
BEFORE UPDATE ON public.user_subject_results
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();