-- Add 'admin' to institution member_role options
ALTER TABLE public.institution_members 
DROP CONSTRAINT IF EXISTS institution_members_member_role_check;

ALTER TABLE public.institution_members
ADD CONSTRAINT institution_members_member_role_check 
CHECK (member_role IN ('student', 'teacher', 'parent', 'admin'));

-- Update register_institution to assign 'admin' role to creator
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
    NULLIF(p_description, ''),
    NULLIF(p_contact_email, ''),
    NULLIF(p_contact_phone, ''),
    NULLIF(p_address, ''),
    NULLIF(p_city, ''),
    NULLIF(p_country, '')
  )
  RETURNING id INTO v_institution_id;

  -- Make creator an admin member of the institution
  INSERT INTO institution_members (institution_id, user_id, member_role, invited_by, status)
  VALUES (v_institution_id, p_user_id, 'admin', p_user_id, 'active')
  ON CONFLICT (institution_id, user_id) DO NOTHING;

  RETURN v_institution_id;
END;
$$;