DROP POLICY IF EXISTS "Anyone can view path enrollments" ON public.path_enrollments;
DROP POLICY IF EXISTS "Anyone can view path progress" ON public.user_path_progress;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_path_progress'
      AND policyname='Users can view own path progress'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view own path progress" ON public.user_path_progress FOR SELECT TO authenticated USING (auth.uid() = user_id)';
  END IF;
END $$;