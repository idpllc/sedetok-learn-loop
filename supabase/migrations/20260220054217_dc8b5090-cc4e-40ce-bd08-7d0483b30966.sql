
-- Allow superadmins to SELECT all institutions
CREATE POLICY "Superadmins can view all institutions"
  ON public.institutions
  FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Allow superadmins to UPDATE any institution
CREATE POLICY "Superadmins can update any institution"
  ON public.institutions
  FOR UPDATE
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Allow superadmins to DELETE any institution
CREATE POLICY "Superadmins can delete any institution"
  ON public.institutions
  FOR DELETE
  USING (has_role(auth.uid(), 'superadmin'::app_role));
