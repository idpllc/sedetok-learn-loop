-- Add game_id column to learning_path_content table
ALTER TABLE learning_path_content 
ADD COLUMN game_id uuid REFERENCES games(id) ON DELETE CASCADE;

-- Add check constraint to ensure only one type of content is set
ALTER TABLE learning_path_content
ADD CONSTRAINT check_single_content_type 
CHECK (
  (content_id IS NOT NULL AND quiz_id IS NULL AND game_id IS NULL) OR
  (content_id IS NULL AND quiz_id IS NOT NULL AND game_id IS NULL) OR
  (content_id IS NULL AND quiz_id IS NULL AND game_id IS NOT NULL)
);