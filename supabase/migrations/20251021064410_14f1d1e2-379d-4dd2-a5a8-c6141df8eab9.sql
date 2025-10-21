-- Create function to check if user is institution admin or teacher for a student
CREATE OR REPLACE FUNCTION public.can_view_student_data(_viewer_id uuid, _student_id uuid)
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
      AND im1.member_role IN ('admin', 'teacher')
      AND im1.status = 'active'
      AND im2.status = 'active'
  );
$$;

-- Add policy for institution admins/teachers to view student quiz results
CREATE POLICY "Institution admins and teachers can view student quiz results"
ON public.user_quiz_results
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.can_view_student_data(auth.uid(), user_id)
);

-- Add policy for institution admins/teachers to view student path progress
CREATE POLICY "Institution admins and teachers can view student progress"
ON public.user_path_progress
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.can_view_student_data(auth.uid(), user_id)
);