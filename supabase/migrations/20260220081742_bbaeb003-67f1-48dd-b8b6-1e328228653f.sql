
-- Drop conflicting policy and recreate
DROP POLICY IF EXISTS "Players can view answers in their game" ON public.live_game_answers;

CREATE POLICY "Players can view answers in their game"
  ON public.live_game_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_game_players p
      JOIN public.live_games lg ON lg.id = p.game_id
      WHERE p.id = live_game_answers.player_id
        AND (
          lg.creator_id = auth.uid()
          OR (auth.uid() IS NOT NULL AND p.user_id = auth.uid())
          OR p.user_id IS NULL
          OR lg.status IN ('in_progress', 'finished')
        )
    )
  );
