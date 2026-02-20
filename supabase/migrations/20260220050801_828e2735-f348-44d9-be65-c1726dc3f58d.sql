-- Función optimizada para obtener el ranking global de instituciones en una sola consulta
-- Reemplaza el patrón N+1 queries (una RPC por institución)
CREATE OR REPLACE FUNCTION public.get_institutions_xp_ranking()
RETURNS TABLE (
  id uuid,
  name text,
  xp_per_capita numeric,
  total_xp bigint,
  member_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    i.id,
    i.name,
    CASE 
      WHEN COUNT(im.user_id) > 0 
      THEN ROUND(COALESCE(SUM(p.experience_points), 0)::numeric / COUNT(im.user_id), 2)
      ELSE 0
    END AS xp_per_capita,
    COALESCE(SUM(p.experience_points), 0) AS total_xp,
    COUNT(im.user_id) AS member_count
  FROM institutions i
  LEFT JOIN institution_members im 
    ON im.institution_id = i.id AND im.status = 'active'
  LEFT JOIN profiles p 
    ON p.id = im.user_id
  GROUP BY i.id, i.name
  ORDER BY xp_per_capita DESC;
$$;

-- Función optimizada para obtener el ranking interno (top estudiantes y profesores) en una sola consulta
CREATE OR REPLACE FUNCTION public.get_institution_internal_ranking(p_institution_id uuid, p_limit int DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  member_role text,
  username text,
  full_name text,
  experience_points int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    im.user_id,
    im.member_role,
    p.username,
    p.full_name,
    COALESCE(p.experience_points, 0) AS experience_points
  FROM institution_members im
  JOIN profiles p ON p.id = im.user_id
  WHERE im.institution_id = p_institution_id
    AND im.status = 'active'
    AND im.member_role IN ('student', 'teacher')
  ORDER BY im.member_role, COALESCE(p.experience_points, 0) DESC;
$$;