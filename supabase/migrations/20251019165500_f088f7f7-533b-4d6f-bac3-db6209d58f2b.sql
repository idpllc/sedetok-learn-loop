-- Add image_url and video_url columns to quiz_options table
ALTER TABLE public.quiz_options
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT;