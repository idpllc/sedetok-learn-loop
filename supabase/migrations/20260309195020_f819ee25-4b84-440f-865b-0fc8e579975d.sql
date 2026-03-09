
DROP POLICY IF EXISTS "Anyone can view active games by PIN" ON public.live_games;

CREATE POLICY "Anyone can view active games by PIN"
ON public.live_games
FOR SELECT
USING (status = ANY (ARRAY['waiting'::text, 'in_progress'::text, 'finished'::text]));
