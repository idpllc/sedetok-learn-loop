-- Create course_institutions junction table for institutional access
CREATE TABLE IF NOT EXISTS public.course_institutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(course_id, institution_id)
);

-- Enable RLS on course_institutions
ALTER TABLE public.course_institutions ENABLE ROW LEVEL SECURITY;

-- Course institutions policies
CREATE POLICY "Course institutions are viewable by institution members"
ON public.course_institutions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.institution_members
    WHERE institution_members.institution_id = course_institutions.institution_id
    AND institution_members.user_id = auth.uid()
    AND institution_members.status = 'active'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_institutions.course_id
    AND courses.creator_id = auth.uid()
  )
);

CREATE POLICY "Course creators can add institutions"
ON public.course_institutions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_institutions.course_id
    AND courses.creator_id = auth.uid()
  )
);

CREATE POLICY "Course creators can remove institutions"
ON public.course_institutions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_institutions.course_id
    AND courses.creator_id = auth.uid()
  )
);

-- Update courses SELECT policy to include institutional access
DROP POLICY IF EXISTS "Public courses are viewable by everyone" ON public.courses;

CREATE POLICY "Courses are viewable based on visibility"
ON public.courses FOR SELECT
USING (
  -- Public courses
  is_public = true
  OR
  -- Own courses
  auth.uid() = creator_id
  OR
  -- Private courses accessible through institution membership
  (
    is_public = false
    AND EXISTS (
      SELECT 1 FROM public.course_institutions ci
      JOIN public.institution_members im ON im.institution_id = ci.institution_id
      WHERE ci.course_id = courses.id
      AND im.user_id = auth.uid()
      AND im.status = 'active'
    )
  )
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_course_institutions_course_id ON public.course_institutions(course_id);
CREATE INDEX IF NOT EXISTS idx_course_institutions_institution_id ON public.course_institutions(institution_id);