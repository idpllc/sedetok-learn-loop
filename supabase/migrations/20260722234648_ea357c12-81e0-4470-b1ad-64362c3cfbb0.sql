
-- 1. path_enrollments: drop overly permissive SELECT
DROP POLICY IF EXISTS "Anyone can view path enrollments" ON public.path_enrollments;

-- 2. user_path_progress: drop overly permissive SELECT, add scoped ones
DROP POLICY IF EXISTS "Anyone can view path progress" ON public.user_path_progress;
CREATE POLICY "Users can view own path progress"
  ON public.user_path_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Path creators can view progress on their paths"
  ON public.user_path_progress FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.learning_paths lp WHERE lp.id = user_path_progress.path_id AND lp.creator_id = auth.uid()));

-- 3. live_game_players: scope "view other players" to participants only
DROP POLICY IF EXISTS "Players can view other players in their game" ON public.live_game_players;
CREATE POLICY "Participants can view players in their game"
  ON public.live_game_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_game_players self
      WHERE self.game_id = live_game_players.game_id
        AND (
          (auth.uid() IS NOT NULL AND self.user_id = auth.uid())
        )
    )
  );

-- 4. profiles: revoke public read on sensitive PII columns
REVOKE SELECT (numero_documento, phone, fecha_nacimiento) ON public.profiles FROM anon, authenticated;

-- 5. Lock down admin-only SECURITY DEFINER functions from anon/public/authenticated.
-- These already enforce has_role('superadmin') internally, but should not be callable at all by anon.
REVOKE EXECUTE ON FUNCTION public.admin_adjust_xp(uuid, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_discount_code(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_discount_codes() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_search_users(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_discount_code(uuid, text, text, text, numeric, text[], text[], integer, timestamptz, timestamptz, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_monthly_educoins(uuid, integer, text) FROM PUBLIC, anon, authenticated;
