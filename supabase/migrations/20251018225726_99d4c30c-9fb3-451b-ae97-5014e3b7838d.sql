-- Add area_academica and no_documento fields to user_quiz_results table
ALTER TABLE public.user_quiz_results 
ADD COLUMN area_academica text,
ADD COLUMN no_documento text;

-- Add comment to describe the fields
COMMENT ON COLUMN public.user_quiz_results.area_academica IS 'Academic area of the quiz';
COMMENT ON COLUMN public.user_quiz_results.no_documento IS 'User document number for tracking';