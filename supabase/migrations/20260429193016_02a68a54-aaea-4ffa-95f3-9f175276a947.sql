-- Allow anyone (including anonymous) to view path enrollments so the public monitoring panel works
DROP POLICY IF EXISTS "Anyone can view path enrollments" ON public.path_enrollments;
CREATE POLICY "Anyone can view path enrollments"
ON public.path_enrollments
FOR SELECT
USING (true);