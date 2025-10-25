-- Add word_wheel game type support
-- Add a column for the initial letter in game_questions
ALTER TABLE game_questions
ADD COLUMN IF NOT EXISTS initial_letter TEXT;

-- Add comment for clarity
COMMENT ON COLUMN game_questions.initial_letter IS 'For word_wheel game type: the letter that the answer must start with';
