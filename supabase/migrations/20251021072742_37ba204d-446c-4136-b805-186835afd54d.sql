-- Function: get_institution_student_ids
-- Purpose: Return all active student user_ids for a given institution, only if the caller is an active member of that institution
-- This avoids RLS limitations on selecting institution_members directly from the client.

create or replace function public.get_institution_student_ids(p_institution_id uuid)
returns table(user_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select im2.user_id
  from public.institution_members im_viewer
  join public.institution_members im2 
    on im2.institution_id = im_viewer.institution_id
  where im_viewer.user_id = auth.uid()
    and im_viewer.institution_id = p_institution_id
    and im_viewer.status = 'active'
    and im2.status = 'active'
    and im2.member_role = 'student';
$$;
