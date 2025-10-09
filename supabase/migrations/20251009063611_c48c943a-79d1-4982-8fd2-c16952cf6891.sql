-- Hacer content_id nullable para permitir quizzes
ALTER TABLE public.learning_path_content 
ALTER COLUMN content_id DROP NOT NULL;

-- Agregar columna para quizzes
ALTER TABLE public.learning_path_content 
ADD COLUMN quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE;

-- Agregar constraint para asegurar que al menos uno esté presente
ALTER TABLE public.learning_path_content
ADD CONSTRAINT check_content_or_quiz 
CHECK (
  (content_id IS NOT NULL AND quiz_id IS NULL) OR 
  (content_id IS NULL AND quiz_id IS NOT NULL)
);