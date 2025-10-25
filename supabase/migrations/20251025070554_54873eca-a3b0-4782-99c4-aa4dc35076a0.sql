-- Add column_match game type to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS left_column_items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE games ADD COLUMN IF NOT EXISTS right_column_items jsonb DEFAULT '[]'::jsonb;

-- Add comment to explain the structure
COMMENT ON COLUMN games.left_column_items IS 'Array of {id, text, image_url, match_id} for left column items';
COMMENT ON COLUMN games.right_column_items IS 'Array of {id, text, image_url, match_id} for right column items';