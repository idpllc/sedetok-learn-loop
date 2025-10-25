-- Drop the problematic policy
DROP POLICY IF EXISTS "Courses are viewable based on visibility" ON public.courses;

-- Create security definer function to check course access
CREATE OR REPLACE FUNCTION public.can_view_course(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    -- Course is public
    SELECT 1 FROM public.courses
    WHERE id = _course_id AND is_public = true
  )
  OR EXISTS (
    -- User is the creator
    SELECT 1 FROM public.courses
    WHERE id = _course_id AND creator_id = _user_id
  )
  OR EXISTS (
    -- User has institutional access
    SELECT 1 FROM public.course_institutions ci
    JOIN public.institution_members im ON im.institution_id = ci.institution_id
    WHERE ci.course_id = _course_id
      AND im.user_id = _user_id
      AND im.status = 'active'
  );
$$;

-- Create new policy using the security definer function
CREATE POLICY "Courses are viewable based on access"
ON public.courses FOR SELECT
USING (
  can_view_course(auth.uid(), id)
);