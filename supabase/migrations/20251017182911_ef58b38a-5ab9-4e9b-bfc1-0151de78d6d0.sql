-- Add tags column to learning_paths table
ALTER TABLE public.learning_paths 
ADD COLUMN tags text[] DEFAULT ARRAY[]::text[];