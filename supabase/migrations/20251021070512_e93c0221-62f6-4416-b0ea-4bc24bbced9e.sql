-- Update function to allow all institution members to view student data
CREATE OR REPLACE FUNCTION public.is_institution_member_of_student(_viewer_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM institution_members im1
    JOIN institution_members im2 ON im1.institution_id = im2.institution_id
    WHERE im1.user_id = _viewer_id
      AND im2.user_id = _student_id
      AND im1.status = 'active'
      AND im2.status = 'active'
  );
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Institution admins and teachers can view student quiz results" ON public.user_quiz_results;
DROP POLICY IF EXISTS "Institution admins and teachers can view student progress" ON public.user_path_progress;

-- Create new policies that allow all institution members to view data
CREATE POLICY "Institution members can view student quiz results"
ON public.user_quiz_results
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.is_institution_member_of_student(auth.uid(), user_id)
);

CREATE POLICY "Institution members can view student progress"
ON public.user_path_progress
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.is_institution_member_of_student(auth.uid(), user_id)
);