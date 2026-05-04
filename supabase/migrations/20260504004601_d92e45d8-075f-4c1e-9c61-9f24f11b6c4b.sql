ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS mp_preapproval_id text,
  ADD COLUMN IF NOT EXISTS mp_payer_email text;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_mp_preapproval ON public.user_subscriptions(mp_preapproval_id);