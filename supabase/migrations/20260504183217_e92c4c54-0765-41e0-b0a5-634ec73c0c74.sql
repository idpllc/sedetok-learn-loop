-- Make discount-code functions safe when Live creates functions before tables.
-- Avoid table row/composite types in function signatures and declarations.

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
  v_dc record;
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

DROP FUNCTION IF EXISTS public.admin_list_discount_codes();
CREATE FUNCTION public.admin_list_discount_codes()
RETURNS TABLE(
  id uuid,
  code text,
  description text,
  discount_type text,
  discount_value numeric,
  applies_to_plans text[],
  applies_to_cycles text[],
  max_uses integer,
  used_count integer,
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    dc.id,
    dc.code,
    dc.description,
    dc.discount_type,
    dc.discount_value,
    dc.applies_to_plans,
    dc.applies_to_cycles,
    dc.max_uses,
    dc.used_count,
    dc.valid_from,
    dc.valid_until,
    dc.is_active,
    dc.created_by,
    dc.created_at,
    dc.updated_at
  FROM public.discount_codes dc
  ORDER BY dc.created_at DESC;
END;
$$;

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