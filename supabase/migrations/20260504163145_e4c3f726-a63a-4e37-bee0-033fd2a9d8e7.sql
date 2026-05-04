
-- Plans: add yearly price
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS price_cop_yearly integer;

-- Default sensible yearly prices (~10 months)
UPDATE public.subscription_plans SET price_cop_yearly = 149000 WHERE code = 'premium' AND price_cop_yearly IS NULL;
UPDATE public.subscription_plans SET price_cop_yearly = 295000 WHERE code = 'ultra' AND price_cop_yearly IS NULL;

-- Subscriptions: billing cycle + discount + MP preference
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS mp_preference_id text,
  ADD COLUMN IF NOT EXISTS discount_code_id uuid,
  ADD COLUMN IF NOT EXISTS discount_amount_cop integer;

-- Payments: discount info + cycle
ALTER TABLE public.subscription_payments
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS discount_code_id uuid,
  ADD COLUMN IF NOT EXISTS discount_amount_cop integer;

-- Discount codes table
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  applies_to_plans text[] DEFAULT NULL,
  applies_to_cycles text[] DEFAULT NULL,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON public.discount_codes (UPPER(code));

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins manage discount codes" ON public.discount_codes;
CREATE POLICY "Superadmins manage discount codes"
  ON public.discount_codes FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER trg_discount_codes_updated
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Redemptions
CREATE TABLE IF NOT EXISTS public.discount_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  amount_discounted_cop integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_code_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own redemptions" ON public.discount_code_redemptions;
CREATE POLICY "Users see own redemptions"
  ON public.discount_code_redemptions FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'::app_role));

-- Validate discount code (callable by anyone)
CREATE OR REPLACE FUNCTION public.validate_discount_code(
  _code text,
  _plan_code text,
  _billing_cycle text,
  _amount_cop integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dc public.discount_codes%ROWTYPE;
  v_discount integer := 0;
  v_final integer;
BEGIN
  SELECT * INTO v_dc FROM public.discount_codes
  WHERE UPPER(code) = UPPER(_code) AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Código no encontrado');
  END IF;

  IF v_dc.valid_from IS NOT NULL AND v_dc.valid_from > now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Código aún no vigente');
  END IF;

  IF v_dc.valid_until IS NOT NULL AND v_dc.valid_until < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Código expirado');
  END IF;

  IF v_dc.max_uses IS NOT NULL AND v_dc.used_count >= v_dc.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Código agotado');
  END IF;

  IF v_dc.applies_to_plans IS NOT NULL AND NOT (_plan_code = ANY(v_dc.applies_to_plans)) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Código no aplica a este plan');
  END IF;

  IF v_dc.applies_to_cycles IS NOT NULL AND NOT (_billing_cycle = ANY(v_dc.applies_to_cycles)) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Código no aplica a este ciclo');
  END IF;

  IF v_dc.discount_type = 'percent' THEN
    v_discount := FLOOR(_amount_cop * (v_dc.discount_value / 100.0))::integer;
  ELSE
    v_discount := LEAST(v_dc.discount_value::integer, _amount_cop);
  END IF;

  v_final := GREATEST(_amount_cop - v_discount, 0);

  RETURN jsonb_build_object(
    'valid', true,
    'discount_code_id', v_dc.id,
    'code', v_dc.code,
    'discount_type', v_dc.discount_type,
    'discount_value', v_dc.discount_value,
    'discount_amount_cop', v_discount,
    'final_amount_cop', v_final
  );
END;
$$;

-- Admin upsert
CREATE OR REPLACE FUNCTION public.admin_upsert_discount_code(
  _id uuid,
  _code text,
  _description text,
  _discount_type text,
  _discount_value numeric,
  _applies_to_plans text[],
  _applies_to_cycles text[],
  _max_uses integer,
  _valid_from timestamptz,
  _valid_until timestamptz,
  _is_active boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.discount_codes (
      code, description, discount_type, discount_value,
      applies_to_plans, applies_to_cycles, max_uses,
      valid_from, valid_until, is_active, created_by
    ) VALUES (
      UPPER(_code), _description, _discount_type, _discount_value,
      _applies_to_plans, _applies_to_cycles, _max_uses,
      _valid_from, _valid_until, COALESCE(_is_active, true), auth.uid()
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.discount_codes SET
      code = UPPER(_code),
      description = _description,
      discount_type = _discount_type,
      discount_value = _discount_value,
      applies_to_plans = _applies_to_plans,
      applies_to_cycles = _applies_to_cycles,
      max_uses = _max_uses,
      valid_from = _valid_from,
      valid_until = _valid_until,
      is_active = COALESCE(_is_active, is_active)
    WHERE id = _id
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- Admin list
CREATE OR REPLACE FUNCTION public.admin_list_discount_codes()
RETURNS SETOF public.discount_codes
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY SELECT * FROM public.discount_codes ORDER BY created_at DESC;
END;
$$;

-- Admin delete
CREATE OR REPLACE FUNCTION public.admin_delete_discount_code(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.discount_codes WHERE id = _id;
END;
$$;
