-- Add feedback column for interactive image questions
ALTER TABLE game_questions
ADD COLUMN IF NOT EXISTS feedback TEXT;