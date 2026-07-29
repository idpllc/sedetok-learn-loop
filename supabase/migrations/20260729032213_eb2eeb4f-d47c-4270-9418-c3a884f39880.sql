DROP POLICY IF EXISTS "Anyone can view chat files" ON storage.objects;

CREATE OR REPLACE FUNCTION public.is_user_in_live_game(_user_id uuid, _game_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.live_game_players p
    WHERE p.game_id = _game_id AND p.user_id = _user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_user_in_live_game(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_user_in_live_game(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Players can view other players in their game" ON public.live_game_players;
DROP POLICY IF EXISTS "Participants can view players in their game" ON public.live_game_players;

CREATE POLICY "Participants can view players in their game"
ON public.live_game_players
FOR SELECT
TO authenticated
USING (public.is_user_in_live_game(auth.uid(), game_id));
