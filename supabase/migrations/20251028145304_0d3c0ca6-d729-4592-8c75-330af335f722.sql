-- Drop the old constraint that only allowed content_id or quiz_id
ALTER TABLE learning_path_content 
DROP CONSTRAINT IF EXISTS check_content_or_quiz;

-- Add new constraint that allows content_id, quiz_id, OR game_id (but only one)
ALTER TABLE learning_path_content 
ADD CONSTRAINT check_content_or_quiz_or_game CHECK (
  (
    (content_id IS NOT NULL AND quiz_id IS NULL AND game_id IS NULL) OR
    (content_id IS NULL AND quiz_id IS NOT NULL AND game_id IS NULL) OR
    (content_id IS NULL AND quiz_id IS NULL AND game_id IS NOT NULL)
  )
);