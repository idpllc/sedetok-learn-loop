CREATE OR REPLACE FUNCTION public.admin_adjust_xp(_user_id uuid, _delta integer, _reason text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_xp integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _delta = 0 THEN
    RAISE EXCEPTION 'Delta must be non-zero';
  END IF;

  UPDATE public.profiles
  SET experience_points = GREATEST(COALESCE(experience_points, 0) + _delta, 0)
  WHERE id = _user_id
  RETURNING experience_points INTO v_new_xp;

  IF v_new_xp IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO public.user_xp_log (user_id, action_type, xp_amount, content_id)
  VALUES (
    _user_id,
    CASE WHEN _delta > 0 THEN 'admin_adjust_add' ELSE 'admin_adjust_remove' END,
    _delta,
    NULL
  );

  RETURN v_new_xp;
END;
$$;