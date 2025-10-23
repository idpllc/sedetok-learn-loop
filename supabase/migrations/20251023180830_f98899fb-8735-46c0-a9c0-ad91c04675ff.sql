-- Add education field to profiles table for formal education
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS education jsonb DEFAULT '[]'::jsonb;