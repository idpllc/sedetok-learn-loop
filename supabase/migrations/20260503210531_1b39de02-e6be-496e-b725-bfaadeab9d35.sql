
-- Plans catalog
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  price_cop integer NOT NULL DEFAULT 0,
  monthly_educoins integer NOT NULL DEFAULT 0,
  max_notebooks integer, -- null = unlimited
  max_sources_per_notebook integer, -- null = unlimited
  voice_chat_access boolean NOT NULL DEFAULT false,
  read_aloud_access boolean NOT NULL DEFAULT false,
  premium_courses_access boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

CREATE POLICY "Superadmins manage plans"
ON public.subscription_plans FOR ALL
USING (public.has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User subscriptions
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'pending', -- pending, active, cancelled, expired, failed
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  epayco_customer_id text,
  epayco_subscription_id text,
  epayco_token_card text,
  last_payment_at timestamptz,
  next_billing_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_subscriptions_user ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE UNIQUE INDEX idx_user_subscriptions_active_unique 
  ON public.user_subscriptions(user_id) WHERE status = 'active';

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription"
ON public.user_subscriptions FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Users insert own subscription"
ON public.user_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own subscription"
ON public.user_subscriptions FOR UPDATE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payments log
CREATE TABLE public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  amount_cop integer NOT NULL,
  status text NOT NULL, -- pending, approved, rejected, failed
  reference text,
  provider text NOT NULL DEFAULT 'epayco',
  provider_transaction_id text,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_payments_user ON public.subscription_payments(user_id);
CREATE INDEX idx_subscription_payments_subscription ON public.subscription_payments(subscription_id);

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments"
ON public.subscription_payments FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'::app_role));

-- Returns the effective plan for a user (free fallback)
CREATE OR REPLACE FUNCTION public.get_user_plan(p_user_id uuid)
RETURNS TABLE(
  plan_id uuid,
  code text,
  name text,
  monthly_educoins integer,
  max_notebooks integer,
  max_sources_per_notebook integer,
  voice_chat_access boolean,
  read_aloud_access boolean,
  premium_courses_access boolean,
  status text,
  current_period_end timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH active_sub AS (
    SELECT us.plan_id, us.status, us.current_period_end
    FROM user_subscriptions us
    WHERE us.user_id = p_user_id
      AND us.status = 'active'
      AND (us.current_period_end IS NULL OR us.current_period_end > now())
    ORDER BY us.created_at DESC
    LIMIT 1
  )
  SELECT 
    sp.id,
    sp.code,
    sp.name,
    sp.monthly_educoins,
    sp.max_notebooks,
    sp.max_sources_per_notebook,
    sp.voice_chat_access,
    sp.read_aloud_access,
    sp.premium_courses_access,
    COALESCE((SELECT status FROM active_sub), 'free'),
    (SELECT current_period_end FROM active_sub)
  FROM subscription_plans sp
  WHERE sp.id = COALESCE((SELECT plan_id FROM active_sub), (SELECT id FROM subscription_plans WHERE code = 'free' LIMIT 1));
$$;

-- Add monthly educoins (accumulating)
CREATE OR REPLACE FUNCTION public.add_monthly_educoins(p_user_id uuid, p_amount integer, p_reason text DEFAULT 'Recarga mensual de plan')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET educoins = COALESCE(educoins, 0) + p_amount
  WHERE id = p_user_id;
END;
$$;

-- Seed plans
INSERT INTO public.subscription_plans (code, name, price_cop, monthly_educoins, max_notebooks, max_sources_per_notebook, voice_chat_access, read_aloud_access, premium_courses_access, sort_order)
VALUES
  ('free', 'Free', 0, 20, 1, 3, false, false, false, 1),
  ('premium', 'Premium', 14900, 100, 20, 50, true, true, false, 2),
  ('ultra', 'Ultra', 29500, 300, NULL, NULL, true, true, true, 3);
