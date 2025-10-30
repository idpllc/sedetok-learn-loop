-- Fix infinite recursion in trivia_1v1_players policies
DROP POLICY IF EXISTS "Users can view match players" ON trivia_1v1_players;

-- Create a simpler policy that doesn't cause recursion
CREATE POLICY "Users can view match players"
  ON trivia_1v1_players FOR SELECT
  USING (
    user_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM trivia_1v1_matches m
      WHERE m.id = trivia_1v1_players.match_id
        AND (m.current_player_id = auth.uid() OR m.winner_id = auth.uid())
    )
  );