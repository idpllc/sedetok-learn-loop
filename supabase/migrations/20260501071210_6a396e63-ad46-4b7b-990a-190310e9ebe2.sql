
-- 1) PROFILES: restrict PII columns from anon/non-owner readers via column privileges.
-- The existing SELECT policy stays (so public profiles remain visible), but anon/authenticated
-- roles can no longer SELECT the sensitive columns directly. Owners/staff use SECURITY DEFINER
-- functions or service role for full access.

REVOKE SELECT (numero_documento, phone, fecha_nacimiento) ON public.profiles FROM anon;
REVOKE SELECT (numero_documento, phone, fecha_nacimiento) ON public.profiles FROM authenticated;

-- Provide a SECURITY DEFINER function so the owner (and staff who can view student data) can still read these fields.
CREATE OR REPLACE FUNCTION public.get_profile_private_fields(_user_id uuid)
RETURNS TABLE(numero_documento text, phone text, fecha_nacimiento date, tipo_documento text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.numero_documento, p.phone, p.fecha_nacimiento, p.tipo_documento
  FROM public.profiles p
  WHERE p.id = _user_id
    AND (
      auth.uid() = p.id
      OR public.has_role(auth.uid(), 'superadmin'::app_role)
      OR public.can_view_student_data(auth.uid(), p.id)
    );
$$;

REVOKE EXECUTE ON FUNCTION public.get_profile_private_fields(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_profile_private_fields(uuid) TO authenticated;

-- 2) USER_QUIZ_RESULTS: drop public policy, add scoped policies.
DROP POLICY IF EXISTS "Quiz results are publicly viewable" ON public.user_quiz_results;

CREATE POLICY "Users can view their own quiz results"
ON public.user_quiz_results
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Institution staff can view student quiz results"
ON public.user_quiz_results
FOR SELECT
TO authenticated
USING (public.can_view_student_data(auth.uid(), user_id));

CREATE POLICY "Superadmins can view all quiz results"
ON public.user_quiz_results
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role));

-- 3) INSTITUTION_MEMBERS: drop public policy, restrict to same-institution members and superadmins.
DROP POLICY IF EXISTS "Institution members are publicly viewable" ON public.institution_members;

CREATE POLICY "Members can view co-members of same institution"
ON public.institution_members
FOR SELECT
TO authenticated
USING (
  public.is_institution_member(auth.uid(), institution_id)
  OR public.is_institution_admin(auth.uid(), institution_id)
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
  OR user_id = auth.uid()
);

-- 4) Lock down internal SECURITY DEFINER helpers that are only meant to be used inside RLS or triggers.
-- They will still be callable by RLS because RLS executes with the function-owner privileges.
DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    'public.has_role(uuid, app_role)',
    'public.is_institution_admin(uuid, uuid)',
    'public.is_institution_staff(uuid, uuid)',
    'public.is_institution_member(uuid, uuid)',
    'public.is_institution_member_of_student(uuid, uuid)',
    'public.is_user_in_trivia_match(uuid, uuid)',
    'public.can_view_student_data(uuid, uuid)',
    'public.can_view_course(uuid, uuid)',
    'public.get_my_conversation_ids()',
    'public.increment_views_count(uuid)',
    'public.increment_likes_count(uuid)',
    'public.decrement_likes_count(uuid)',
    'public.increment_saves_count(uuid)',
    'public.decrement_saves_count(uuid)',
    'public.increment_comments_count(uuid)',
    'public.decrement_comments_count(uuid)',
    'public.increment_shares_count(uuid)',
    'public.award_xp_for_action(uuid, uuid, text, boolean)',
    'public.award_xp_for_upload(uuid, uuid)',
    'public.award_xp_for_quiz_creation(uuid, uuid)',
    'public.award_xp_for_path_creation(uuid, uuid)',
    'public.check_and_award_path_completion_xp(uuid, uuid)',
    'public.calculate_institution_xp_per_capita(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated, public', fn);
    EXCEPTION WHEN undefined_function THEN
      -- skip if signature differs slightly
      NULL;
    END;
  END LOOP;
END $$;
