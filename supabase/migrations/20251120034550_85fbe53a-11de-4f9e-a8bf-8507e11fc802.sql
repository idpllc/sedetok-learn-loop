-- Add feedback column to live_game_questions
ALTER TABLE live_game_questions ADD COLUMN IF NOT EXISTS feedback TEXT;

COMMENT ON COLUMN live_game_questions.feedback IS 'Rich text feedback to show after displaying results';