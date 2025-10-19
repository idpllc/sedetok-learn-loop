-- Modify the check constraint to allow null values for both content_id and quiz_id
-- This allows for general XP transactions that aren't tied to specific content or quizzes
ALTER TABLE user_xp_log 
DROP CONSTRAINT IF EXISTS user_xp_log_content_or_quiz_check;

-- Add a more flexible constraint that allows operations without content/quiz association
-- but still ensures data integrity for positive XP gains
ALTER TABLE user_xp_log 
ADD CONSTRAINT user_xp_log_content_or_quiz_check 
CHECK (
  -- For positive XP (gains), require content_id or quiz_id
  (xp_amount > 0 AND (content_id IS NOT NULL OR quiz_id IS NOT NULL))
  OR 
  -- For negative XP (deductions), allow without content_id or quiz_id
  (xp_amount <= 0)
);