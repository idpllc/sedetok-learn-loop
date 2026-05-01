-- Pre-flight cleanup for Live before the unique progress indexes are created.
-- This migration MUST run immediately before 20260430032027, otherwise Live fails
-- on CREATE UNIQUE INDEX user_path_progress_unique_content when duplicate progress
-- rows already exist.

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
