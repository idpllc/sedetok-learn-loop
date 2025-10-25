-- Modify quiz_evaluation_events to support games
ALTER TABLE quiz_evaluation_events 
ADD COLUMN game_id UUID REFERENCES games(id) ON DELETE CASCADE;

-- Add check constraint to ensure either quiz_id or game_id is set, but not both
ALTER TABLE quiz_evaluation_events
ADD CONSTRAINT quiz_or_game_check CHECK (
  (quiz_id IS NOT NULL AND game_id IS NULL) OR
  (quiz_id IS NULL AND game_id IS NOT NULL)
);

-- Modify the existing constraint to make quiz_id nullable
ALTER TABLE quiz_evaluation_events 
ALTER COLUMN quiz_id DROP NOT NULL;

-- Add game_id to user_quiz_results to track game results
ALTER TABLE user_quiz_results
ADD COLUMN game_id UUID REFERENCES games(id) ON DELETE CASCADE;

-- Add check constraint to ensure either quiz_id or game_id is set
ALTER TABLE user_quiz_results
ADD CONSTRAINT result_quiz_or_game_check CHECK (
  (quiz_id IS NOT NULL AND game_id IS NULL) OR
  (quiz_id IS NULL AND game_id IS NOT NULL)
);

-- Modify existing constraint to make quiz_id nullable
ALTER TABLE user_quiz_results
ALTER COLUMN quiz_id DROP NOT NULL;

-- Update RLS policies for quiz_evaluation_events to include games
DROP POLICY IF EXISTS "Anyone can view events by access code" ON quiz_evaluation_events;
CREATE POLICY "Anyone can view events by access code"
ON quiz_evaluation_events FOR SELECT
USING ((start_date <= now()) AND (end_date >= now()));

-- Drop and recreate the get_evaluation_event_by_code function to support games
DROP FUNCTION IF EXISTS get_evaluation_event_by_code(TEXT);

CREATE OR REPLACE FUNCTION get_evaluation_event_by_code(p_access_code TEXT)
RETURNS TABLE (
  id UUID,
  quiz_id UUID,
  game_id UUID,
  creator_id UUID,
  title TEXT,
  description TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  access_code TEXT,
  require_authentication BOOLEAN,
  allow_multiple_attempts BOOLEAN,
  show_results_immediately BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qee.id,
    qee.quiz_id,
    qee.game_id,
    qee.creator_id,
    qee.title,
    qee.description,
    qee.start_date,
    qee.end_date,
    qee.access_code,
    qee.require_authentication,
    qee.allow_multiple_attempts,
    qee.show_results_immediately,
    qee.created_at,
    qee.updated_at
  FROM quiz_evaluation_events qee
  WHERE UPPER(qee.access_code) = UPPER(p_access_code);
END;
$$;