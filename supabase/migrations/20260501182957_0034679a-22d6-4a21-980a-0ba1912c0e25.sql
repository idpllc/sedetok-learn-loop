-- Sanitize duplicates in user_path_progress before creating unique indexes (Live blocker)
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

-- Ensure CHECK constraint allowing game_id is in place
ALTER TABLE public.user_path_progress
  DROP CONSTRAINT IF EXISTS user_path_progress_check;

ALTER TABLE public.user_path_progress
  ADD CONSTRAINT user_path_progress_check
  CHECK (
    (content_id IS NOT NULL AND quiz_id IS NULL AND game_id IS NULL)
    OR (content_id IS NULL AND quiz_id IS NOT NULL AND game_id IS NULL)
    OR (content_id IS NULL AND quiz_id IS NULL AND game_id IS NOT NULL)
  );

-- Drop legacy unique constraint if still present
ALTER TABLE public.user_path_progress
  DROP CONSTRAINT IF EXISTS user_path_progress_user_id_path_id_content_id_quiz_id_key;

-- Recreate partial unique indexes (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS user_path_progress_unique_content
  ON public.user_path_progress (user_id, path_id, content_id)
  WHERE content_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_path_progress_unique_quiz
  ON public.user_path_progress (user_id, path_id, quiz_id)
  WHERE quiz_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_path_progress_unique_game
  ON public.user_path_progress (user_id, path_id, game_id)
  WHERE game_id IS NOT NULL;