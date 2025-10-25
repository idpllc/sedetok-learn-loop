-- Remove old constraint that prevents same path in different levels
ALTER TABLE public.course_routes 
DROP CONSTRAINT IF EXISTS course_routes_course_id_path_id_key;

-- Add new constraint allowing same path in different levels but not within the same level
ALTER TABLE public.course_routes
ADD CONSTRAINT course_routes_course_level_path_unique 
UNIQUE (course_id, level_id, path_id);
