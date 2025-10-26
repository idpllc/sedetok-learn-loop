-- Add game_id to likes table
ALTER TABLE public.likes
ADD COLUMN game_id UUID REFERENCES public.games(id) ON DELETE CASCADE;

-- Add game_id to saves table
ALTER TABLE public.saves
ADD COLUMN game_id UUID REFERENCES public.games(id) ON DELETE CASCADE;

-- Add game_id to comments table
ALTER TABLE public.comments
ADD COLUMN game_id UUID REFERENCES public.games(id) ON DELETE CASCADE;

-- Add interaction counters to games table
ALTER TABLE public.games
ADD COLUMN likes_count INTEGER DEFAULT 0,
ADD COLUMN comments_count INTEGER DEFAULT 0,
ADD COLUMN saves_count INTEGER DEFAULT 0,
ADD COLUMN shares_count INTEGER DEFAULT 0;

-- Add constraint to ensure exactly one of content_id, quiz_id, or game_id is set in likes
ALTER TABLE public.likes
ADD CONSTRAINT likes_content_type_check 
CHECK (
  (content_id IS NOT NULL AND quiz_id IS NULL AND game_id IS NULL) OR
  (content_id IS NULL AND quiz_id IS NOT NULL AND game_id IS NULL) OR
  (content_id IS NULL AND quiz_id IS NULL AND game_id IS NOT NULL)
);

-- Add constraint to ensure exactly one of content_id, quiz_id, or game_id is set in saves
ALTER TABLE public.saves
ADD CONSTRAINT saves_content_type_check 
CHECK (
  (content_id IS NOT NULL AND quiz_id IS NULL AND game_id IS NULL) OR
  (content_id IS NULL AND quiz_id IS NOT NULL AND game_id IS NULL) OR
  (content_id IS NULL AND quiz_id IS NULL AND game_id IS NOT NULL)
);

-- Add constraint to ensure exactly one of content_id, quiz_id, or game_id is set in comments
ALTER TABLE public.comments
ADD CONSTRAINT comments_content_type_check 
CHECK (
  (content_id IS NOT NULL AND quiz_id IS NULL AND game_id IS NULL) OR
  (content_id IS NULL AND quiz_id IS NOT NULL AND game_id IS NULL) OR
  (content_id IS NULL AND quiz_id IS NULL AND game_id IS NOT NULL)
);

-- Update increment_likes_count function to handle games
CREATE OR REPLACE FUNCTION increment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.content_id IS NOT NULL THEN
      UPDATE content SET likes_count = likes_count + 1 WHERE id = NEW.content_id;
    ELSIF NEW.quiz_id IS NOT NULL THEN
      UPDATE quizzes SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.quiz_id;
    ELSIF NEW.game_id IS NOT NULL THEN
      UPDATE games SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.game_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.content_id IS NOT NULL THEN
      UPDATE content SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.content_id;
    ELSIF OLD.quiz_id IS NOT NULL THEN
      UPDATE quizzes SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = OLD.quiz_id;
    ELSIF OLD.game_id IS NOT NULL THEN
      UPDATE games SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = OLD.game_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update increment_saves_count function to handle games
CREATE OR REPLACE FUNCTION increment_saves_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.content_id IS NOT NULL THEN
      UPDATE content SET saves_count = saves_count + 1 WHERE id = NEW.content_id;
    ELSIF NEW.quiz_id IS NOT NULL THEN
      UPDATE quizzes SET saves_count = COALESCE(saves_count, 0) + 1 WHERE id = NEW.quiz_id;
    ELSIF NEW.game_id IS NOT NULL THEN
      UPDATE games SET saves_count = COALESCE(saves_count, 0) + 1 WHERE id = NEW.game_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.content_id IS NOT NULL THEN
      UPDATE content SET saves_count = GREATEST(saves_count - 1, 0) WHERE id = OLD.content_id;
    ELSIF OLD.quiz_id IS NOT NULL THEN
      UPDATE quizzes SET saves_count = GREATEST(COALESCE(saves_count, 0) - 1, 0) WHERE id = OLD.quiz_id;
    ELSIF OLD.game_id IS NOT NULL THEN
      UPDATE games SET saves_count = GREATEST(COALESCE(saves_count, 0) - 1, 0) WHERE id = OLD.game_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update increment_comments_count function to handle games
CREATE OR REPLACE FUNCTION increment_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.content_id IS NOT NULL THEN
      UPDATE content SET comments_count = comments_count + 1 WHERE id = NEW.content_id;
    ELSIF NEW.quiz_id IS NOT NULL THEN
      UPDATE quizzes SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.quiz_id;
    ELSIF NEW.game_id IS NOT NULL THEN
      UPDATE games SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.game_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.content_id IS NOT NULL THEN
      UPDATE content SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.content_id;
    ELSIF OLD.quiz_id IS NOT NULL THEN
      UPDATE quizzes SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id = OLD.quiz_id;
    ELSIF OLD.game_id IS NOT NULL THEN
      UPDATE games SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id = OLD.game_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update increment_shares_count function to handle games
CREATE OR REPLACE FUNCTION increment_shares_count(content_id uuid DEFAULT NULL, quiz_id uuid DEFAULT NULL, game_id uuid DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF content_id IS NOT NULL THEN
    UPDATE content SET shares_count = shares_count + 1 WHERE id = content_id;
  ELSIF quiz_id IS NOT NULL THEN
    UPDATE quizzes SET shares_count = COALESCE(shares_count, 0) + 1 WHERE id = quiz_id;
  ELSIF game_id IS NOT NULL THEN
    UPDATE games SET shares_count = COALESCE(shares_count, 0) + 1 WHERE id = game_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;