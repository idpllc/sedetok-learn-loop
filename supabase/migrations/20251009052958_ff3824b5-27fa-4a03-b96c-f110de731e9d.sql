-- Agregar columnas faltantes a learning_paths
ALTER TABLE public.learning_paths
ADD COLUMN IF NOT EXISTS objectives text,
ADD COLUMN IF NOT EXISTS subject text,
ADD COLUMN IF NOT EXISTS topic text,
ADD COLUMN IF NOT EXISTS level text,
ADD COLUMN IF NOT EXISTS language text DEFAULT 'Español',
ADD COLUMN IF NOT EXISTS cover_url text,
ADD COLUMN IF NOT EXISTS enforce_order boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS require_quiz_pass boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_collaboration boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS required_routes uuid[],
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS total_xp integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_duration integer DEFAULT 0;

-- Agregar check constraint para status
ALTER TABLE public.learning_paths
DROP CONSTRAINT IF EXISTS learning_paths_status_check;

ALTER TABLE public.learning_paths
ADD CONSTRAINT learning_paths_status_check 
CHECK (status IN ('draft', 'published', 'archived'));

-- Agregar columnas faltantes a learning_path_content
ALTER TABLE public.learning_path_content
ADD COLUMN IF NOT EXISTS section_name text,
ADD COLUMN IF NOT EXISTS is_required boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS estimated_time_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp_reward integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS prerequisites jsonb DEFAULT '[]'::jsonb;