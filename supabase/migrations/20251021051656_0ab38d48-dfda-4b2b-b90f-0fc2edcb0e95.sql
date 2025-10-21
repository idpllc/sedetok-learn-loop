-- Create function to register institution with proper role assignment
-- This bypasses RLS restrictions using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.register_institution(
  p_user_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_contact_email TEXT,
  p_contact_phone TEXT,
  p_address TEXT,
  p_city TEXT,
  p_country TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_institution_id UUID;
BEGIN
  -- Add institution role to user (bypasses RLS)
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, 'institution')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create institution
  INSERT INTO institutions (
    admin_user_id,
    name,
    description,
    contact_email,
    contact_phone,
    address,
    city,
    country
  )
  VALUES (
    p_user_id,
    p_name,
    p_description,
    p_contact_email,
    p_contact_phone,
    p_address,
    p_city,
    p_country
  )
  RETURNING id INTO v_institution_id;

  RETURN v_institution_id;
END;
$$;