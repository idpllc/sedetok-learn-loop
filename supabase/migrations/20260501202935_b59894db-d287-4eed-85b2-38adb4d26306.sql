-- Definitive repair for Live publish blocker on user_path_progress.
-- This intentionally uses a later version than every pending migration so Test records
-- the fixed statement set and Live can apply it after the historical blocker has been
-- neutralized by the already-recorded repair sequence.

WITH ranked_content AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, path_id, content_id
      ORDER BY
        completed DESC NULLS LAST,
        completed_at DESC NULLS LAST,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id DESC
    ) AS rn
  FROM public.user_path_progress
  WHERE content_id IS NOT NULL
)
DELETE FROM public.user_path_progress upp
USING ranked_content r
WHERE upp.id = r.id
  AND r.rn > 1;

WITH ranked_quiz AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, path_id, quiz_id
      ORDER BY
        completed DESC NULLS LAST,
        completed_at DESC NULLS LAST,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id DESC
    ) AS rn
  FROM public.user_path_progress
  WHERE quiz_id IS NOT NULL
)
DELETE FROM public.user_path_progress upp
USING ranked_quiz r
WHERE upp.id = r.id
  AND r.rn > 1;

WITH ranked_game AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, path_id, game_id
      ORDER BY
        completed DESC NULLS LAST,
        completed_at DESC NULLS LAST,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id DESC
    ) AS rn
  FROM public.user_path_progress
  WHERE game_id IS NOT NULL
)
DELETE FROM public.user_path_progress upp
USING ranked_game r
WHERE upp.id = r.id
  AND r.rn > 1;

ALTER TABLE public.user_path_progress
  DROP CONSTRAINT IF EXISTS user_path_progress_check;

ALTER TABLE public.user_path_progress
  ADD CONSTRAINT user_path_progress_check
  CHECK (
    (content_id IS NOT NULL AND quiz_id IS NULL AND game_id IS NULL)
    OR (content_id IS NULL AND quiz_id IS NOT NULL AND game_id IS NULL)
    OR (content_id IS NULL AND quiz_id IS NULL AND game_id IS NOT NULL)
  );

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

DROP POLICY IF EXISTS "Progress viewable by owner, path creator, or institution staff" ON public.user_path_progress;
DROP POLICY IF EXISTS "Anyone can view path progress" ON public.user_path_progress;

CREATE POLICY "Anyone can view path progress"
  ON public.user_path_progress
  FOR SELECT
  USING (true);