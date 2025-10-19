-- Add tags column to quizzes table
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT ARRAY[]::text[];