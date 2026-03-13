
CREATE OR REPLACE FUNCTION public.is_institution_staff(_user_id uuid, _institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.institutions WHERE id = _institution_id AND admin_user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.institution_members
    WHERE user_id = _user_id
      AND institution_id = _institution_id
      AND status = 'active'
      AND member_role IN ('admin', 'coordinator', 'teacher')
  );
$$;

CREATE POLICY "Staff can create groups"
ON public.academic_groups
FOR INSERT
TO authenticated
WITH CHECK (is_institution_staff(auth.uid(), institution_id));

CREATE POLICY "Staff can update own groups"
ON public.academic_groups
FOR UPDATE
TO authenticated
USING (
  director_user_id = auth.uid()
  OR is_institution_admin(auth.uid(), institution_id)
);

CREATE POLICY "Staff can add group members"
ON public.academic_group_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.academic_groups ag
    WHERE ag.id = academic_group_members.group_id
      AND is_institution_staff(auth.uid(), ag.institution_id)
  )
);
