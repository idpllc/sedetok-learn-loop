-- 0) Deduplicate existing rows, keeping the most recent per (user, path, item)
DELETE FROM public.user_path_progress a
USING public.user_path_progress b
WHERE a.id <> b.id
  AND a.user_id = b.user_id
  AND a.path_id = b.path_id
  AND a.content_id IS NOT DISTINCT FROM b.content_id
  AND a.quiz_id IS NOT DISTINCT FROM b.quiz_id
  AND COALESCE(a.game_id::text, '') = COALESCE(b.game_id::text, '')
  AND (
    COALESCE(a.completed_at, a.created_at) < COALESCE(b.completed_at, b.created_at)
    OR (
      COALESCE(a.completed_at, a.created_at) = COALESCE(b.completed_at, b.created_at)
      AND a.id < b.id
    )
  );

-- 1) Fix CHECK constraint to allow game_id as a third valid option
ALTER TABLE public.user_path_progress
  DROP CONSTRAINT IF EXISTS user_path_progress_check;

ALTER TABLE public.user_path_progress
  ADD CONSTRAINT user_path_progress_check
  CHECK (
    (content_id IS NOT NULL AND quiz_id IS NULL AND game_id IS NULL)
    OR (content_id IS NULL AND quiz_id IS NOT NULL AND game_id IS NULL)
    OR (content_id IS NULL AND quiz_id IS NULL AND game_id IS NOT NULL)
  );

-- 2) Replace UNIQUE constraint with partial indexes including game_id
ALTER TABLE public.user_path_progress
  DROP CONSTRAINT IF EXISTS user_path_progress_user_id_path_id_content_id_quiz_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS user_path_progress_unique_content
  ON public.user_path_progress (user_id, path_id, content_id)
  WHERE content_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_path_progress_unique_quiz
  ON public.user_path_progress (user_id, path_id, quiz_id)
  WHERE quiz_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_path_progress_unique_game
  ON public.user_path_progress (user_id, path_id, game_id)
  WHERE game_id IS NOT NULL;

-- 3) Allow public read of progress
DROP POLICY IF EXISTS "Progress viewable by owner, path creator, or institution staff" ON public.user_path_progress;

CREATE POLICY "Anyone can view path progress"
  ON public.user_path_progress
  FOR SELECT
  USING (true);