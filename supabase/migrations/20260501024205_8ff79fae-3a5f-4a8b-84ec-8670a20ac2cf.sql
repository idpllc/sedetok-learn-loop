-- Add new value to content_type enum
ALTER TYPE public.content_type ADD VALUE IF NOT EXISTS 'mapa_mental';

-- Add column to store the mind map tree structure
ALTER TABLE public.content 
ADD COLUMN IF NOT EXISTS mind_map_data JSONB;