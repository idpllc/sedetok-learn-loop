-- Crear tabla de niveles de curso
CREATE TABLE public.course_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Agregar level_id a course_routes
ALTER TABLE public.course_routes
ADD COLUMN level_id UUID REFERENCES public.course_levels(id) ON DELETE SET NULL;

-- RLS policies para course_levels
ALTER TABLE public.course_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Course levels are viewable by everyone"
  ON public.course_levels
  FOR SELECT
  USING (true);

CREATE POLICY "Course creators can manage levels"
  ON public.course_levels
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_levels.course_id
    AND courses.creator_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_levels.course_id
    AND courses.creator_id = auth.uid()
  ));

-- Índices para mejorar rendimiento
CREATE INDEX idx_course_levels_course_id ON public.course_levels(course_id);
CREATE INDEX idx_course_routes_level_id ON public.course_routes(level_id);