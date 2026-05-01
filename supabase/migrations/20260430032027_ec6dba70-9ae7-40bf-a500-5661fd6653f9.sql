-- 0) Deduplicate existing rows, keeping the most complete/recent row per item.
-- This is intentionally repeated here so the blocking index migration is safe even
-- if a previous publish attempt skipped the pre-flight 20260430032026 migration.
WITH ranked_content AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, path_id, content_id ORDER BY completed DESC NULLS LAST, completed_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC) AS rn
  FROM public.user_path_progress
  WHERE content_id IS NOT NULL
)
DELETE FROM public.user_path_progress upp
USING ranked_content r
WHERE upp.id = r.id AND r.rn > 1;

WITH ranked_quiz AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, path_id, quiz_id ORDER BY completed DESC NULLS LAST, completed_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC) AS rn
  FROM public.user_path_progress
  WHERE quiz_id IS NOT NULL
)
DELETE FROM public.user_path_progress upp
USING ranked_quiz r
WHERE upp.id = r.id AND r.rn > 1;

WITH ranked_game AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, path_id, game_id ORDER BY completed DESC NULLS LAST, completed_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC) AS rn
  FROM public.user_path_progress
  WHERE game_id IS NOT NULL
)
DELETE FROM public.user_path_progress upp
USING ranked_game r
WHERE upp.id = r.id AND r.rn > 1;

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

-- 2) Remove the legacy UNIQUE constraint.
-- The partial unique indexes are created later by 20260501182957 after Live data
-- has been sanitized. Keeping CREATE UNIQUE INDEX here is what blocks publishing
-- when Live has duplicate historical progress rows.
ALTER TABLE public.user_path_progress
  DROP CONSTRAINT IF EXISTS user_path_progress_user_id_path_id_content_id_quiz_id_key;

-- 3) Allow public read of progress
DROP POLICY IF EXISTS "Progress viewable by owner, path creator, or institution staff" ON public.user_path_progress;
DROP POLICY IF EXISTS "Anyone can view path progress" ON public.user_path_progress;

CREATE POLICY "Anyone can view path progress"
  ON public.user_path_progress
  FOR SELECT
  USING (true);