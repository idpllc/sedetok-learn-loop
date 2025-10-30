-- Add level column to trivia_questions table
ALTER TABLE trivia_questions
ADD COLUMN level text NOT NULL DEFAULT 'libre'
CHECK (level IN ('preescolar', 'primaria', 'secundaria', 'universidad', 'libre'));

-- Add index for better performance
CREATE INDEX idx_trivia_questions_level ON trivia_questions(level);
CREATE INDEX idx_trivia_questions_category_level ON trivia_questions(category_id, level);