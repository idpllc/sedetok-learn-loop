-- Add cover_url column to institutions table
ALTER TABLE public.institutions
ADD COLUMN IF NOT EXISTS cover_url TEXT;