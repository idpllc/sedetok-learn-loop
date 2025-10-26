-- Add interactive_image game type support
-- Add support for interactive image points in game_questions
ALTER TABLE game_questions 
ADD COLUMN IF NOT EXISTS point_x NUMERIC,
ADD COLUMN IF NOT EXISTS point_y NUMERIC,
ADD COLUMN IF NOT EXISTS lives_cost INTEGER DEFAULT 1;

-- Add comment for clarity
COMMENT ON COLUMN game_questions.point_x IS 'X coordinate (0-100%) for interactive image games';
COMMENT ON COLUMN game_questions.point_y IS 'Y coordinate (0-100%) for interactive image games';
COMMENT ON COLUMN game_questions.lives_cost IS 'Lives lost per incorrect click in interactive image games';