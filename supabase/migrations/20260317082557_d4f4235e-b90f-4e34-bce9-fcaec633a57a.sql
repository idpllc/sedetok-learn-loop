-- Allow students to see study plans that match their document number
CREATE POLICY "Users can view study plan by document number"
ON public.student_study_plans
FOR SELECT
TO authenticated
USING (
  document_number IS NOT NULL 
  AND document_number IN (
    SELECT p.numero_documento 
    FROM public.profiles p 
    WHERE p.id = auth.uid() 
      AND p.numero_documento IS NOT NULL
  )
);
