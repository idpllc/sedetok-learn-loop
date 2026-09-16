ALTER TABLE public.institution_domains
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
  ADD COLUMN IF NOT EXISTS last_webhook_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_webhook_status TEXT;