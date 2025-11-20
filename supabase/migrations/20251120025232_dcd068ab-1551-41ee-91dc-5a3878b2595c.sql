-- Fix RLS policies for live_game_players to allow joining games
-- The issue is that the current policy doesn't properly handle both authenticated and anonymous users

-- Drop existing policies
DROP POLICY IF EXISTS "Users can join games as players" ON live_game_players;
DROP POLICY IF EXISTS "Game creators can view all players" ON live_game_players;
DROP POLICY IF EXISTS "Players can view other players in their game" ON live_game_players;

-- Allow anyone to join a game (authenticated or anonymous)
CREATE POLICY "Anyone can join games as players"
ON live_game_players
FOR INSERT
WITH CHECK (
  -- Allow authenticated users to join with their user_id
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  -- Allow anonymous users to join with NULL user_id
  (auth.uid() IS NULL AND user_id IS NULL)
);

-- Game creators can view all players in their games
CREATE POLICY "Game creators can view all players"
ON live_game_players
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM live_games
    WHERE live_games.id = live_game_players.game_id
    AND live_games.creator_id = auth.uid()
  )
);

-- All players can view other players in the same game
CREATE POLICY "Players can view other players in their game"
ON live_game_players
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM live_games
    WHERE live_games.id = live_game_players.game_id
  )
);