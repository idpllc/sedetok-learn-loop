-- Fix RLS recursion by using SECURITY DEFINER helper functions

-- 1) Helper functions
CREATE OR REPLACE FUNCTION public.is_institution_member(_user_id uuid, _institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1 from public.institution_members im
    where im.institution_id = _institution_id
      and im.user_id = _user_id
      and im.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_institution_admin(_user_id uuid, _institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1 from public.institutions i
    where i.id = _institution_id
      and i.admin_user_id = _user_id
  );
$$;

-- 2) Recreate policies to use helper functions (avoid cross-table references)
-- Drop old policies
DROP POLICY IF EXISTS "Institutions are viewable by admins and members" ON public.institutions;
DROP POLICY IF EXISTS "Admins can create institutions" ON public.institutions;
DROP POLICY IF EXISTS "Admins can update their institutions" ON public.institutions;
DROP POLICY IF EXISTS "Admins can delete their institutions" ON public.institutions;

DROP POLICY IF EXISTS "Institution members are viewable by institution admin and members" ON public.institution_members;
DROP POLICY IF EXISTS "Institution admins can add members" ON public.institution_members;
DROP POLICY IF EXISTS "Institution admins can update members" ON public.institution_members;
DROP POLICY IF EXISTS "Institution admins can delete members" ON public.institution_members;

-- Institutions
CREATE POLICY "institutions_select_admin_or_member"
ON public.institutions FOR SELECT
USING (
  auth.uid() = admin_user_id
  OR public.is_institution_member(auth.uid(), id)
);

CREATE POLICY "institutions_insert_admin"
ON public.institutions FOR INSERT
WITH CHECK (auth.uid() = admin_user_id);

CREATE POLICY "institutions_update_admin"
ON public.institutions FOR UPDATE
USING (auth.uid() = admin_user_id)
WITH CHECK (auth.uid() = admin_user_id);

CREATE POLICY "institutions_delete_admin"
ON public.institutions FOR DELETE
USING (auth.uid() = admin_user_id);

-- Institution Members
CREATE POLICY "members_select_admin_or_self"
ON public.institution_members FOR SELECT
USING (
  public.is_institution_admin(auth.uid(), institution_id)
  OR auth.uid() = user_id
);

CREATE POLICY "members_insert_admin"
ON public.institution_members FOR INSERT
WITH CHECK (public.is_institution_admin(auth.uid(), institution_id));

CREATE POLICY "members_update_admin"
ON public.institution_members FOR UPDATE
USING (public.is_institution_admin(auth.uid(), institution_id));

CREATE POLICY "members_delete_admin"
ON public.institution_members FOR DELETE
USING (public.is_institution_admin(auth.uid(), institution_id));