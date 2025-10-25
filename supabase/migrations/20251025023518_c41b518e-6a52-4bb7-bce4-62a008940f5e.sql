-- Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  category category_type NOT NULL,
  grade_level grade_level NOT NULL,
  learning_types tipo_aprendizaje[] DEFAULT ARRAY[]::tipo_aprendizaje[],
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_public BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'draft',
  total_xp INTEGER DEFAULT 0,
  estimated_duration INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create course_routes junction table
CREATE TABLE IF NOT EXISTS public.course_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(course_id, path_id)
);

-- Enable RLS on courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Courses RLS Policies
CREATE POLICY "Public courses are viewable by everyone"
ON public.courses FOR SELECT
USING (is_public = true OR auth.uid() = creator_id);

CREATE POLICY "Users can create courses"
ON public.courses FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own courses"
ON public.courses FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete own courses"
ON public.courses FOR DELETE
USING (auth.uid() = creator_id);

CREATE POLICY "Superadmins can manage all courses"
ON public.courses FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Enable RLS on course_routes
ALTER TABLE public.course_routes ENABLE ROW LEVEL SECURITY;

-- Course routes RLS Policies
CREATE POLICY "Course routes are viewable by everyone"
ON public.course_routes FOR SELECT
USING (true);

CREATE POLICY "Course creators can add routes"
ON public.course_routes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_routes.course_id
    AND courses.creator_id = auth.uid()
  )
);

CREATE POLICY "Course creators can update routes"
ON public.course_routes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_routes.course_id
    AND courses.creator_id = auth.uid()
  )
);

CREATE POLICY "Course creators can delete routes"
ON public.course_routes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_routes.course_id
    AND courses.creator_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_creator_id ON public.courses(creator_id);
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_grade_level ON public.courses(grade_level);
CREATE INDEX IF NOT EXISTS idx_courses_is_public ON public.courses(is_public);
CREATE INDEX IF NOT EXISTS idx_course_routes_course_id ON public.course_routes(course_id);
CREATE INDEX IF NOT EXISTS idx_course_routes_path_id ON public.course_routes(path_id);