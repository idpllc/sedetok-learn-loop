
-- Add fields to track admin-created payment links
ALTER TABLE public.user_subscriptions 
  ADD COLUMN IF NOT EXISTS mp_init_point text,
  ADD COLUMN IF NOT EXISTS created_by_admin uuid,
  ADD COLUMN IF NOT EXISTS plan_code_snapshot text,
  ADD COLUMN IF NOT EXISTS amount_cop integer;

-- RPC for public payment link page (no auth required to display)
CREATE OR REPLACE FUNCTION public.get_payment_link(_subscription_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'subscription_id', us.id,
    'status', us.status,
    'plan_code', sp.code,
    'plan_name', sp.name,
    'billing_cycle', us.billing_cycle,
    'amount_cop', COALESCE(us.amount_cop, 
      CASE WHEN us.billing_cycle = 'yearly' 
        THEN COALESCE(sp.price_cop_yearly, sp.price_cop * 12) 
        ELSE sp.price_cop END),
    'discount_amount_cop', COALESCE(us.discount_amount_cop, 0),
    'init_point', us.mp_init_point,
    'beneficiary_user_id', us.user_id,
    'beneficiary_name', COALESCE(p.full_name, p.username, us.mp_payer_email),
    'beneficiary_email', us.mp_payer_email,
    'created_at', us.created_at,
    'created_by_admin', us.created_by_admin IS NOT NULL
  )
  INTO result
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON sp.id = us.plan_id
  LEFT JOIN public.profiles p ON p.id = us.user_id
  WHERE us.id = _subscription_id;
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_payment_link(uuid) TO anon, authenticated;
