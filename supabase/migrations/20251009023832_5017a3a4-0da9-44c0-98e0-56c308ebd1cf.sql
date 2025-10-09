-- Add 'lectura' to content_type enum
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'lectura';

-- Add rich_text column to content table
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS rich_text TEXT;