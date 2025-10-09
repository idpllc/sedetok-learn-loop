-- Add short_answer to question_type enum
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'short_answer';

-- Add comparison_mode field to quiz_questions for short answer validation
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS comparison_mode TEXT DEFAULT 'exact' CHECK (comparison_mode IN ('exact', 'flexible'));

-- Add feedback_correct and feedback_incorrect for more detailed feedback
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS feedback_correct TEXT,
ADD COLUMN IF NOT EXISTS feedback_incorrect TEXT;