-- Drop legacy constraints that block game_id inserts
ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_content_or_quiz_check;
ALTER TABLE public.saves DROP CONSTRAINT IF EXISTS saves_content_or_quiz_check;
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_content_or_quiz_check;

-- Ensure new 3-way constraints exist (content | quiz | game)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'likes_content_type_check'
  ) THEN
    ALTER TABLE public.likes
    ADD CONSTRAINT likes_content_type_check 
    CHECK (
      (content_id IS NOT NULL AND quiz_id IS NULL AND game_id IS NULL) OR
      (content_id IS NULL AND quiz_id IS NOT NULL AND game_id IS NULL) OR
      (content_id IS NULL AND quiz_id IS NULL AND game_id IS NOT NULL)
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'saves_content_type_check'
  ) THEN
    ALTER TABLE public.saves
    ADD CONSTRAINT saves_content_type_check 
    CHECK (
      (content_id IS NOT NULL AND quiz_id IS NULL AND game_id IS NULL) OR
      (content_id IS NULL AND quiz_id IS NOT NULL AND game_id IS NULL) OR
      (content_id IS NULL AND quiz_id IS NULL AND game_id IS NOT NULL)
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'comments_content_type_check'
  ) THEN
    ALTER TABLE public.comments
    ADD CONSTRAINT comments_content_type_check 
    CHECK (
      (content_id IS NOT NULL AND quiz_id IS NULL AND game_id IS NULL) OR
      (content_id IS NULL AND quiz_id IS NOT NULL AND game_id IS NULL) OR
      (content_id IS NULL AND quiz_id IS NULL AND game_id IS NOT NULL)
    );
  END IF;
END $$;