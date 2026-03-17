-- Allow superadmins to view all study plans
CREATE POLICY "Superadmins can view all study plans"
ON public.student_study_plans
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));
