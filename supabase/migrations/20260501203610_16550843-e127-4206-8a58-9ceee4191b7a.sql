CREATE OR REPLACE FUNCTION public.get_user_path_progress_duplicate_preflight()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH content_duplicates AS (
  SELECT
    COUNT(*)::integer AS duplicate_groups,
    COALESCE(SUM(row_count - 1), 0)::integer AS redundant_rows,
    COALESCE(MAX(row_count), 0)::integer AS largest_group
  FROM (
    SELECT user_id, path_id, content_id, COUNT(*) AS row_count
    FROM public.user_path_progress
    WHERE content_id IS NOT NULL
    GROUP BY user_id, path_id, content_id
    HAVING COUNT(*) > 1
  ) grouped
), quiz_duplicates AS (
  SELECT
    COUNT(*)::integer AS duplicate_groups,
    COALESCE(SUM(row_count - 1), 0)::integer AS redundant_rows,
    COALESCE(MAX(row_count), 0)::integer AS largest_group
  FROM (
    SELECT user_id, path_id, quiz_id, COUNT(*) AS row_count
    FROM public.user_path_progress
    WHERE quiz_id IS NOT NULL
    GROUP BY user_id, path_id, quiz_id
    HAVING COUNT(*) > 1
  ) grouped
), game_duplicates AS (
  SELECT
    COUNT(*)::integer AS duplicate_groups,
    COALESCE(SUM(row_count - 1), 0)::integer AS redundant_rows,
    COALESCE(MAX(row_count), 0)::integer AS largest_group
  FROM (
    SELECT user_id, path_id, game_id, COUNT(*) AS row_count
    FROM public.user_path_progress
    WHERE game_id IS NOT NULL
    GROUP BY user_id, path_id, game_id
    HAVING COUNT(*) > 1
  ) grouped
), invalid_rows AS (
  SELECT COUNT(*)::integer AS total
  FROM public.user_path_progress
  WHERE ((content_id IS NOT NULL)::int + (quiz_id IS NOT NULL)::int + (game_id IS NOT NULL)::int) <> 1
), totals AS (
  SELECT
    c.duplicate_groups AS content_groups,
    c.redundant_rows AS content_redundant,
    c.largest_group AS content_largest,
    q.duplicate_groups AS quiz_groups,
    q.redundant_rows AS quiz_redundant,
    q.largest_group AS quiz_largest,
    g.duplicate_groups AS game_groups,
    g.redundant_rows AS game_redundant,
    g.largest_group AS game_largest,
    i.total AS invalid_rows,
    (c.duplicate_groups + q.duplicate_groups + g.duplicate_groups) AS total_duplicate_groups,
    (c.redundant_rows + q.redundant_rows + g.redundant_rows) AS total_redundant_rows,
    GREATEST(c.largest_group, q.largest_group, g.largest_group) AS largest_group
  FROM content_duplicates c
  CROSS JOIN quiz_duplicates q
  CROSS JOIN game_duplicates g
  CROSS JOIN invalid_rows i
)
SELECT jsonb_build_object(
  'checked_at', now(),
  'table', 'user_path_progress',
  'has_duplicates', total_redundant_rows > 0,
  'can_publish_progress_indexes', total_redundant_rows = 0 AND invalid_rows = 0,
  'total_duplicate_groups', total_duplicate_groups,
  'total_redundant_rows', total_redundant_rows,
  'largest_group', largest_group,
  'invalid_rows', invalid_rows,
  'duplicates', jsonb_build_object(
    'content_id', jsonb_build_object(
      'duplicate_groups', content_groups,
      'redundant_rows', content_redundant,
      'largest_group', content_largest
    ),
    'quiz_id', jsonb_build_object(
      'duplicate_groups', quiz_groups,
      'redundant_rows', quiz_redundant,
      'largest_group', quiz_largest
    ),
    'game_id', jsonb_build_object(
      'duplicate_groups', game_groups,
      'redundant_rows', game_redundant,
      'largest_group', game_largest
    )
  ),
  'message', CASE
    WHEN total_redundant_rows > 0 THEN
      format(
        'Publicación bloqueada: user_path_progress tiene %s grupos duplicados y %s filas sobrantes. content_id: %s grupos/%s filas; quiz_id: %s grupos/%s filas; game_id: %s grupos/%s filas.',
        total_duplicate_groups,
        total_redundant_rows,
        content_groups,
        content_redundant,
        quiz_groups,
        quiz_redundant,
        game_groups,
        game_redundant
      )
    WHEN invalid_rows > 0 THEN
      format('Publicación bloqueada: user_path_progress tiene %s filas inválidas sin exactamente un item asociado.', invalid_rows)
    ELSE
      'Preflight OK: no hay duplicados en user_path_progress. La publicación puede crear los índices únicos de progreso.'
  END
)
FROM totals;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_path_progress_duplicate_preflight() FROM anon, authenticated, public;