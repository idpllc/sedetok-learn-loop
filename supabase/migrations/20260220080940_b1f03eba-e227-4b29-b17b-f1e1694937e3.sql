
-- Fix 1: Allow players to update their own score (both authenticated and anonymous)
CREATE POLICY "Players can update their own score"
ON public.live_game_players
FOR UPDATE
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR 
  (auth.uid() IS NULL AND user_id IS NULL)
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR 
  (auth.uid() IS NULL AND user_id IS NULL)
);

-- Fix 2: Allow anonymous players to submit answers (they have user_id = NULL)
DROP POLICY IF EXISTS "Players can submit their own answers" ON public.live_game_answers;

CREATE POLICY "Players can submit their own answers"
ON public.live_game_answers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM live_game_players
    WHERE live_game_players.id = live_game_answers.player_id
      AND (
        (live_game_players.user_id = auth.uid())
        OR 
        (live_game_players.user_id IS NULL AND auth.uid() IS NULL)
      )
  )
);

-- Fix 3: Allow anonymous players to view answers in their game (needed for duplicate check)
DROP POLICY IF EXISTS "Players can view their own answers" ON public.live_game_answers;

CREATE POLICY "Players can view answers in their game"
ON public.live_game_answers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM live_game_players lgp
    JOIN live_games lg ON lg.id = lgp.game_id
    WHERE lgp.id = live_game_answers.player_id
      AND (
        lg.creator_id = auth.uid()
        OR lgp.user_id = auth.uid()
        OR lgp.user_id IS NULL
      )
  )
);

-- Fix 4: Allow players to view their own player record (needed to fetch current score)
CREATE POLICY "Players can view themselves"
ON public.live_game_players
FOR SELECT
USING (
  user_id IS NULL  -- anonymous players can read their own row
  OR user_id = auth.uid()
);
