ALTER TABLE public.learning_paths
ADD COLUMN IF NOT EXISTS path_type text NOT NULL DEFAULT 'ruta';

ALTER TABLE public.learning_paths
ADD CONSTRAINT learning_paths_path_type_check
CHECK (path_type IN ('ruta', 'curso'));