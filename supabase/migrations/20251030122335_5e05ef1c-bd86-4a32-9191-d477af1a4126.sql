-- Update the check constraint to remove 'preescolar' level
ALTER TABLE trivia_questions DROP CONSTRAINT IF EXISTS trivia_questions_level_check;
ALTER TABLE trivia_questions ADD CONSTRAINT trivia_questions_level_check 
  CHECK (level IN ('primaria', 'secundaria', 'universidad', 'libre'));