CREATE OR REPLACE FUNCTION public.admin_search_users(_search text)
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  institution text,
  numero_documento text,
  email text,
  experience_points integer,
  educoins integer,
  created_at timestamptz,
  roles text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.institution,
    p.numero_documento,
    u.email::text,
    COALESCE(p.experience_points, 0),
    COALESCE(p.educoins, 0),
    p.created_at,
    COALESCE(ARRAY(SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = p.id), ARRAY[]::text[])
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE
    _search IS NULL
    OR _search = ''
    OR p.username ILIKE '%' || _search || '%'
    OR p.full_name ILIKE '%' || _search || '%'
    OR p.numero_documento ILIKE '%' || _search || '%'
    OR u.email ILIKE '%' || _search || '%'
  ORDER BY p.created_at DESC
  LIMIT 500;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_user_detail(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'profile', to_jsonb(p.*),
    'email', u.email,
    'last_sign_in_at', u.last_sign_in_at,
    'email_confirmed_at', u.email_confirmed_at,
    'roles', COALESCE(ARRAY(SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = p.id), ARRAY[]::text[]),
    'institutions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'institution_id', im.institution_id,
        'institution_name', i.name,
        'member_role', im.member_role,
        'status', im.status
      ))
      FROM public.institution_members im
      LEFT JOIN public.institutions i ON i.id = im.institution_id
      WHERE im.user_id = p.id
    ), '[]'::jsonb),
    'content_count', (SELECT COUNT(*) FROM public.content WHERE creator_id = p.id),
    'games_count', (SELECT COUNT(*) FROM public.games WHERE creator_id = p.id),
    'quizzes_count', (SELECT COUNT(*) FROM public.quizzes WHERE creator_id = p.id),
    'paths_count', (SELECT COUNT(*) FROM public.learning_paths WHERE creator_id = p.id)
  )
  INTO result
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.id = _user_id;

  RETURN result;
END;
$$;