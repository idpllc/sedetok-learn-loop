-- Add institution NIT, sede name, grade and group to user_subject_results table
ALTER TABLE public.user_subject_results 
ADD COLUMN nit_institucion text,
ADD COLUMN nombre_sede text,
ADD COLUMN grado text,
ADD COLUMN grupo text;

-- Create index for NIT lookups
CREATE INDEX idx_user_subject_results_nit ON public.user_subject_results(nit_institucion);
CREATE INDEX idx_user_subject_results_grado_grupo ON public.user_subject_results(grado, grupo);