CREATE TABLE public.media_repair_items (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null,
  path_id uuid,
  path_title text,
  content_title text,
  field text not null,
  old_url text not null,
  status text not null default 'broken',
  suggestions jsonb not null default '[]'::jsonb,
  new_url text,
  fixed_by uuid,
  fixed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_id, field)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_repair_items TO authenticated;
GRANT ALL ON public.media_repair_items TO service_role;
ALTER TABLE public.media_repair_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins manage media repair" ON public.media_repair_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'superadmin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin'));
CREATE TRIGGER media_repair_items_updated BEFORE UPDATE ON public.media_repair_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();