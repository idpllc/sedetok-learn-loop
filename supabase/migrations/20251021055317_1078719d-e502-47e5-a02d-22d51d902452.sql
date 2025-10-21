-- Helper function to find user by email or username
CREATE OR REPLACE FUNCTION public.find_user_by_email_or_username(search_text TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- First try by username
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE username = search_text
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;
  
  -- Then try by email in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = search_text
  LIMIT 1;
  
  RETURN v_user_id;
END;
$$;