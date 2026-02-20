
-- Fix: Allow anonymous players to view questions in active/finished games
-- The previous policy required user_id = auth.uid(), blocking anonymous (user_id IS NULL) players

DROP POLICY IF EXISTS "Questions are viewable by game participants" ON public.live_game_questions;

CREATE POLICY "Questions are viewable by game participants"
  ON public.live_game_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_games lg
      WHERE lg.id = live_game_questions.game_id
        AND (
          -- Game creator always sees questions
          lg.creator_id = auth.uid()
          OR
          -- Any registered player in the game
          EXISTS (
            SELECT 1 FROM public.live_game_players lgp
            WHERE lgp.game_id = lg.id
              AND lgp.user_id = auth.uid()
          )
          OR
          -- Anonymous players: game must be active or finished
          (auth.uid() IS NULL AND lg.status IN ('in_progress', 'finished'))
          OR
          -- Logged-in users who joined anonymously (no user_id): game must be active or finished
          (lg.status IN ('in_progress', 'finished') AND EXISTS (
            SELECT 1 FROM public.live_game_players lgp
            WHERE lgp.game_id = lg.id AND lgp.user_id IS NULL
          ))
        )
    )
  );

-- Also fix INSERT for anonymous answers: allow when game is active
-- The current policy checks auth.uid() IS NULL AND user_id IS NULL which is correct,
-- but let's make it explicit and also cover the case via a separate clean policy.
DROP POLICY IF EXISTS "Players can submit their own answers" ON public.live_game_answers;

CREATE POLICY "Players can submit their own answers"
  ON public.live_game_answers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.live_game_players lgp
      JOIN public.live_games lg ON lg.id = lgp.game_id
      WHERE lgp.id = live_game_answers.player_id
        AND lg.status = 'in_progress'
        AND (
          -- Authenticated player
          (auth.uid() IS NOT NULL AND lgp.user_id = auth.uid())
          OR
          -- Anonymous player
          (auth.uid() IS NULL AND lgp.user_id IS NULL)
        )
    )
  );

-- Fix UPDATE for anonymous players on live_game_players (score update)
DROP POLICY IF EXISTS "Players can update their own score" ON public.live_game_players;

CREATE POLICY "Players can update their own score"
  ON public.live_game_players
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id IS NULL)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );
