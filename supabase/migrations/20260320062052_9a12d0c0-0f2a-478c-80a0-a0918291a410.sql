
CREATE OR REPLACE FUNCTION public.get_institutional_trivia_ranking()
RETURNS TABLE(
  institution_id uuid,
  name text,
  logo_url text,
  total_points bigint,
  total_matches bigint,
  total_correct bigint,
  total_students bigint,
  best_streak integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id AS institution_id,
    i.name,
    i.logo_url,
    COALESCE(SUM(ts.total_points), 0) AS total_points,
    COALESCE(SUM(ts.total_matches), 0) AS total_matches,
    COALESCE(SUM(ts.total_correct), 0) AS total_correct,
    COUNT(DISTINCT im.user_id) AS total_students,
    COALESCE(MAX(ts.best_streak), 0) AS best_streak
  FROM institutions i
  JOIN institution_members im ON im.institution_id = i.id AND im.status = 'active'
  LEFT JOIN trivia_user_stats ts ON ts.user_id = im.user_id
  GROUP BY i.id, i.name, i.logo_url
  HAVING COALESCE(SUM(ts.total_points), 0) > 0
  ORDER BY total_points DESC
  LIMIT 50;
$$;
