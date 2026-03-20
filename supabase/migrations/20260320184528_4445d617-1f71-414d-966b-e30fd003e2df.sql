
CREATE TABLE public.path_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, path_id)
);

ALTER TABLE public.path_enrollments ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can enroll themselves
CREATE POLICY "Users can insert own enrollments"
  ON public.path_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can see their own enrollments
CREATE POLICY "Users can view own enrollments"
  ON public.path_enrollments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Path creators can see enrollments for their paths
CREATE POLICY "Creators can view enrollments for their paths"
  ON public.path_enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_paths lp
      WHERE lp.id = path_id AND lp.creator_id = auth.uid()
    )
  );
