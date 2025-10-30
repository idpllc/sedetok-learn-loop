-- Add audio_url column to quiz_questions table
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS audio_url TEXT;