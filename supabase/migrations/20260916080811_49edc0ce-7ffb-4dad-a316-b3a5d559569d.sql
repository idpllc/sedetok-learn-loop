CREATE TABLE public.institution_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX institution_domains_domain_key ON public.institution_domains (lower(domain));
CREATE INDEX institution_domains_institution_idx ON public.institution_domains (institution_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.institution_domains TO authenticated;
GRANT SELECT ON public.institution_domains TO anon;
GRANT ALL ON public.institution_domains TO service_role;

ALTER TABLE public.institution_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active institution domains"
  ON public.institution_domains FOR SELECT
  USING (is_active = true);

CREATE POLICY "Institution admins manage their domains"
  ON public.institution_domains FOR ALL
  TO authenticated
  USING (public.is_institution_admin(auth.uid(), institution_id) OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.is_institution_admin(auth.uid(), institution_id) OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER institution_domains_updated_at
  BEFORE UPDATE ON public.institution_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS return_origin TEXT;

CREATE OR REPLACE FUNCTION public.is_allowed_return_domain(_domain TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.institution_domains
    WHERE is_active = true AND lower(domain) = lower(_domain)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_allowed_return_domain(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_allowed_return_domain(TEXT) TO authenticated, service_role;