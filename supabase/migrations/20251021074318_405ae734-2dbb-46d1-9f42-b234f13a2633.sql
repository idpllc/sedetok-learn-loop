-- Add NIT and DANE code fields to institutions table
ALTER TABLE public.institutions 
ADD COLUMN IF NOT EXISTS nit text,
ADD COLUMN IF NOT EXISTS codigo_dane text;