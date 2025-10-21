-- Fix relationship for PostgREST joins: point institution_members.user_id to public.profiles(id)
DO $$ BEGIN
  -- Drop existing FK if it exists (likely pointing to auth.users)
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'institution_members'
      AND c.conname = 'institution_members_user_id_fkey'
  ) THEN
    ALTER TABLE public.institution_members
      DROP CONSTRAINT institution_members_user_id_fkey;
  END IF;
END $$;

-- Recreate FK to profiles.id
ALTER TABLE public.institution_members
  ADD CONSTRAINT institution_members_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Optional: ensure helpful index for (institution_id) filter
CREATE INDEX IF NOT EXISTS idx_institution_members_institution_id
  ON public.institution_members (institution_id);
