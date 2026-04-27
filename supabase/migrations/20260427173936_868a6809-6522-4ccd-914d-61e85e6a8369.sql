ALTER TABLE public.learning_paths
ADD COLUMN IF NOT EXISTS require_enrollment boolean NOT NULL DEFAULT false;