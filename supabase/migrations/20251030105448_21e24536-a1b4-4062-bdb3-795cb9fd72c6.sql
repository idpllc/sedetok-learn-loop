-- Add comments_count column to quizzes table
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0;

-- Add comments_count column to games table if exists
ALTER TABLE games ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0;