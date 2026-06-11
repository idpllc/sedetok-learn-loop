
CREATE OR REPLACE FUNCTION public.slugify(_input text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(
    regexp_replace(
      lower(
        translate(
          coalesce(_input, ''),
          'áàâäãéèêëíìîïóòôöõúùûüñçÁÀÂÄÃÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇ',
          'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
        )
      ),
      '[^a-z0-9]+', '-', 'g'
    ),
    '(^-+)|(-+$)', '', 'g'
  );
$$;

ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS slug text;

DO $$
DECLARE
  r RECORD;
  base_slug text;
  candidate text;
  i int;
BEGIN
  FOR r IN SELECT id, name FROM public.institutions WHERE slug IS NULL OR slug = '' LOOP
    base_slug := NULLIF(public.slugify(r.name), '');
    IF base_slug IS NULL THEN base_slug := 'institucion'; END IF;
    candidate := base_slug;
    i := 1;
    WHILE EXISTS (SELECT 1 FROM public.institutions WHERE slug = candidate AND id <> r.id) LOOP
      i := i + 1;
      candidate := base_slug || '-' || i::text;
    END LOOP;
    UPDATE public.institutions SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS institutions_slug_unique ON public.institutions(slug) WHERE slug IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ensure_institution_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text;
  candidate text;
  i int := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := NULLIF(public.slugify(NEW.name), '');
    IF base_slug IS NULL THEN base_slug := 'institucion'; END IF;
    candidate := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.institutions WHERE slug = candidate AND id <> NEW.id) LOOP
      i := i + 1;
      candidate := base_slug || '-' || i::text;
    END LOOP;
    NEW.slug := candidate;
  ELSE
    NEW.slug := public.slugify(NEW.slug);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_institutions_slug ON public.institutions;
CREATE TRIGGER trg_institutions_slug
BEFORE INSERT OR UPDATE OF slug, name ON public.institutions
FOR EACH ROW EXECUTE FUNCTION public.ensure_institution_slug();

CREATE TABLE IF NOT EXISTS public.learning_path_institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(path_id, institution_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_path_institutions TO authenticated;
GRANT SELECT ON public.learning_path_institutions TO anon;
GRANT ALL ON public.learning_path_institutions TO service_role;

ALTER TABLE public.learning_path_institutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view path-institution links" ON public.learning_path_institutions;
CREATE POLICY "Anyone can view path-institution links"
ON public.learning_path_institutions FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Path creators can link institutions" ON public.learning_path_institutions;
CREATE POLICY "Path creators can link institutions"
ON public.learning_path_institutions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.learning_paths lp
    WHERE lp.id = path_id AND lp.creator_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Path creators can unlink institutions" ON public.learning_path_institutions;
CREATE POLICY "Path creators can unlink institutions"
ON public.learning_path_institutions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.learning_paths lp
    WHERE lp.id = path_id AND lp.creator_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.can_view_path(_user_id uuid, _path_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.learning_paths
    WHERE id = _path_id AND is_public = true
  )
  OR EXISTS (
    SELECT 1 FROM public.learning_paths
    WHERE id = _path_id AND creator_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.learning_path_institutions lpi
    JOIN public.institution_members im ON im.institution_id = lpi.institution_id
    WHERE lpi.path_id = _path_id
      AND im.user_id = _user_id
      AND im.status = 'active'
  );
$$;

DROP POLICY IF EXISTS "Public learning paths are viewable by everyone" ON public.learning_paths;
DROP POLICY IF EXISTS "Visible learning paths" ON public.learning_paths;
CREATE POLICY "Visible learning paths"
ON public.learning_paths FOR SELECT
USING (
  is_public = true
  OR auth.uid() = creator_id
  OR EXISTS (
    SELECT 1 FROM public.learning_path_institutions lpi
    JOIN public.institution_members im ON im.institution_id = lpi.institution_id
    WHERE lpi.path_id = learning_paths.id
      AND im.user_id = auth.uid()
      AND im.status = 'active'
  )
);

CREATE OR REPLACE FUNCTION public.get_institution_member_xp(_institution_id uuid, _user_id uuid)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH institution_paths AS (
    SELECT path_id FROM public.learning_path_institutions WHERE institution_id = _institution_id
    UNION
    SELECT cr.path_id FROM public.course_routes cr
    JOIN public.course_institutions ci ON ci.course_id = cr.course_id
    WHERE ci.institution_id = _institution_id
  ),
  institution_quizzes AS (
    SELECT DISTINCT lpc.quiz_id
    FROM public.learning_path_content lpc
    WHERE lpc.path_id IN (SELECT path_id FROM institution_paths) AND lpc.quiz_id IS NOT NULL
  )
  SELECT COALESCE(SUM(xp.xp_amount), 0)::bigint
  FROM public.user_xp_log xp
  WHERE xp.user_id = _user_id
    AND (
      xp.path_id IN (SELECT path_id FROM institution_paths)
      OR xp.quiz_id IN (SELECT quiz_id FROM institution_quizzes)
    );
$$;

CREATE OR REPLACE FUNCTION public.get_institution_xp_ranking(_institution_id uuid, _limit int DEFAULT 50)
RETURNS TABLE(user_id uuid, full_name text, username text, avatar_url text, member_role text, xp bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    im.user_id,
    p.full_name,
    p.username,
    p.avatar_url,
    im.member_role::text,
    public.get_institution_member_xp(_institution_id, im.user_id) AS xp
  FROM public.institution_members im
  JOIN public.profiles p ON p.id = im.user_id
  WHERE im.institution_id = _institution_id
    AND im.status = 'active'
  ORDER BY xp DESC NULLS LAST, p.full_name ASC
  LIMIT GREATEST(COALESCE(_limit, 50), 1);
$$;

CREATE OR REPLACE FUNCTION public.get_institution_by_slug(_slug text)
RETURNS TABLE(id uuid, name text, slug text, description text, logo_url text, cover_url text, city text, country text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.name, i.slug, i.description, i.logo_url, i.cover_url, i.city, i.country, i.created_at
  FROM public.institutions i
  WHERE i.slug = lower(_slug)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_institution_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_institution_member_xp(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_institution_xp_ranking(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_path(uuid, uuid) TO authenticated;
