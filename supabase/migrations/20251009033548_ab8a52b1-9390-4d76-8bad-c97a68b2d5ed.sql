-- Fix foreign key constraint for quiz_questions
-- Drop the existing foreign key constraint
ALTER TABLE public.quiz_questions 
DROP CONSTRAINT IF EXISTS quiz_questions_content_id_fkey;

-- Add the correct foreign key constraint pointing to quizzes table
ALTER TABLE public.quiz_questions 
ADD CONSTRAINT quiz_questions_quiz_id_fkey 
FOREIGN KEY (content_id) 
REFERENCES public.quizzes(id) 
ON DELETE CASCADE;