-- 1) PROFILES: replace permissive policy with privacy-aware policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles viewable by self, public, or institution staff"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR perfil_publico = true
  OR public.can_view_student_data(auth.uid(), id)
  OR public.is_institution_member_of_student(auth.uid(), id)
);

-- 2) USER_PATH_PROGRESS: restrict to owner / path creator / institution staff
DROP POLICY IF EXISTS "Progress is publicly viewable" ON public.user_path_progress;

CREATE POLICY "Progress viewable by owner, path creator, or institution staff"
ON public.user_path_progress
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.learning_paths lp
    WHERE lp.id = user_path_progress.path_id
      AND lp.creator_id = auth.uid()
  )
  OR public.can_view_student_data(auth.uid(), user_id)
);

-- 3) TRIVIA_USER_ACHIEVEMENTS: require authentication
DROP POLICY IF EXISTS "Users can view all user achievements" ON public.trivia_user_achievements;

CREATE POLICY "Authenticated users can view trivia achievements"
ON public.trivia_user_achievements
FOR SELECT
TO authenticated
USING (true);