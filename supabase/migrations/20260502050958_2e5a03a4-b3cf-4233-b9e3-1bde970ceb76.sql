
CREATE TABLE public.notebook_capsule_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id uuid NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  capsule_id uuid NOT NULL,
  capsule_type text NOT NULL,
  studied_at timestamp with time zone NOT NULL DEFAULT now(),
  reason text,
  UNIQUE (notebook_id, capsule_id)
);

CREATE INDEX idx_notebook_capsule_progress_notebook
  ON public.notebook_capsule_progress (notebook_id, studied_at DESC);

ALTER TABLE public.notebook_capsule_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own capsule progress"
  ON public.notebook_capsule_progress
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own capsule progress"
  ON public.notebook_capsule_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.notebooks n
      WHERE n.id = notebook_id AND n.user_id = auth.uid()
    )
  );

CREATE POLICY "Users update own capsule progress"
  ON public.notebook_capsule_progress
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own capsule progress"
  ON public.notebook_capsule_progress
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
