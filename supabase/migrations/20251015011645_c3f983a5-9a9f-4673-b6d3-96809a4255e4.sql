-- Add subject column to content table to store specific subject/asignatura
ALTER TABLE public.content
ADD COLUMN subject text;

-- Add subject column to quizzes table for consistency
ALTER TABLE public.quizzes
ADD COLUMN subject text;

-- Add index for better performance on subject filtering
CREATE INDEX idx_content_subject ON public.content(subject);
CREATE INDEX idx_quizzes_subject ON public.quizzes(subject);

COMMENT ON COLUMN public.content.subject IS 'Specific subject/asignatura (e.g., "Inglés", "Matemáticas", "Ingeniería de Petróleos")';
COMMENT ON COLUMN public.quizzes.subject IS 'Specific subject/asignatura (e.g., "Inglés", "Matemáticas", "Ingeniería de Petróleos")';