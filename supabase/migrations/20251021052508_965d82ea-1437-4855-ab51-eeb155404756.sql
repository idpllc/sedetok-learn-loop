-- Update register_institution to avoid touching user_roles (RLS issue)
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
  -- Create institution only; do not modify global roles here
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
    NULLIF(p_description, ''),
    NULLIF(p_contact_email, ''),
    NULLIF(p_contact_phone, ''),
    NULLIF(p_address, ''),
    NULLIF(p_city, ''),
    NULLIF(p_country, '')
  )
  RETURNING id INTO v_institution_id;

  RETURN v_institution_id;
END;
$$;