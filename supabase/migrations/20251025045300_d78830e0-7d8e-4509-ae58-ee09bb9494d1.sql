-- Add FK between courses.creator_id and profiles.id to enable safe relationship expansion and prevent join errors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courses_creator_id_fkey'
  ) THEN
    ALTER TABLE public.courses
    ADD CONSTRAINT courses_creator_id_fkey
    FOREIGN KEY (creator_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;
