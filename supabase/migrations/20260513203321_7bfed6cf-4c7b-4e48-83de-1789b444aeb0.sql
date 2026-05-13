ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'presentacion';
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS presentation_data jsonb;