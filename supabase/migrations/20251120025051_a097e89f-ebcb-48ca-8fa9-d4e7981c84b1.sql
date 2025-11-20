-- Fix RLS policies for live_game_questions table
-- The issue is that the policies are comparing live_games.id = live_games.game_id
-- when they should be comparing live_games.id = live_game_questions.game_id

-- Drop existing policies
DROP POLICY IF EXISTS "Game creators can manage questions" ON live_game_questions;
DROP POLICY IF EXISTS "Questions are viewable by game participants" ON live_game_questions;

-- Recreate correct policies
CREATE POLICY "Game creators can manage questions"
ON live_game_questions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM live_games
    WHERE live_games.id = live_game_questions.game_id
    AND live_games.creator_id = auth.uid()
  )
);

CREATE POLICY "Questions are viewable by game participants"
ON live_game_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM live_games
    WHERE live_games.id = live_game_questions.game_id
    AND (
      live_games.creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM live_game_players
        WHERE live_game_players.game_id = live_games.id
        AND live_game_players.user_id = auth.uid()
      )
    )
  )
);