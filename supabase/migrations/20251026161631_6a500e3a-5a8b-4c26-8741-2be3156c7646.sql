-- Safe redefinition of counter functions to support games and proper DELETE returns
CREATE OR REPLACE FUNCTION public.increment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.content_id IS NOT NULL THEN
      UPDATE public.content SET likes_count = likes_count + 1 WHERE id = NEW.content_id;
    ELSIF NEW.quiz_id IS NOT NULL THEN
      UPDATE public.quizzes SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.quiz_id;
    ELSIF NEW.game_id IS NOT NULL THEN
      UPDATE public.games SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.game_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.content_id IS NOT NULL THEN
      UPDATE public.content SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.content_id;
    ELSIF OLD.quiz_id IS NOT NULL THEN
      UPDATE public.quizzes SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = OLD.quiz_id;
    ELSIF OLD.game_id IS NOT NULL THEN
      UPDATE public.games SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = OLD.game_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_saves_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.content_id IS NOT NULL THEN
      UPDATE public.content SET saves_count = saves_count + 1 WHERE id = NEW.content_id;
    ELSIF NEW.quiz_id IS NOT NULL THEN
      UPDATE public.quizzes SET saves_count = COALESCE(saves_count, 0) + 1 WHERE id = NEW.quiz_id;
    ELSIF NEW.game_id IS NOT NULL THEN
      UPDATE public.games SET saves_count = COALESCE(saves_count, 0) + 1 WHERE id = NEW.game_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.content_id IS NOT NULL THEN
      UPDATE public.content SET saves_count = GREATEST(saves_count - 1, 0) WHERE id = OLD.content_id;
    ELSIF OLD.quiz_id IS NOT NULL THEN
      UPDATE public.quizzes SET saves_count = GREATEST(COALESCE(saves_count, 0) - 1, 0) WHERE id = OLD.quiz_id;
    ELSIF OLD.game_id IS NOT NULL THEN
      UPDATE public.games SET saves_count = GREATEST(COALESCE(saves_count, 0) - 1, 0) WHERE id = OLD.game_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.content_id IS NOT NULL THEN
      UPDATE public.content SET comments_count = comments_count + 1 WHERE id = NEW.content_id;
    ELSIF NEW.quiz_id IS NOT NULL THEN
      UPDATE public.quizzes SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.quiz_id;
    ELSIF NEW.game_id IS NOT NULL THEN
      UPDATE public.games SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.game_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.content_id IS NOT NULL THEN
      UPDATE public.content SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.content_id;
    ELSIF OLD.quiz_id IS NOT NULL THEN
      UPDATE public.quizzes SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id = OLD.quiz_id;
    ELSIF OLD.game_id IS NOT NULL THEN
      UPDATE public.games SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id = OLD.game_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Shares counter function already handles game_id via RPC

-- Ensure triggers exist on likes, saves, and comments
DROP TRIGGER IF EXISTS trg_likes_counter_ins ON public.likes;
DROP TRIGGER IF EXISTS trg_likes_counter_del ON public.likes;
CREATE TRIGGER trg_likes_counter_ins
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.increment_likes_count();
CREATE TRIGGER trg_likes_counter_del
AFTER DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.increment_likes_count();

DROP TRIGGER IF EXISTS trg_saves_counter_ins ON public.saves;
DROP TRIGGER IF EXISTS trg_saves_counter_del ON public.saves;
CREATE TRIGGER trg_saves_counter_ins
AFTER INSERT ON public.saves
FOR EACH ROW EXECUTE FUNCTION public.increment_saves_count();
CREATE TRIGGER trg_saves_counter_del
AFTER DELETE ON public.saves
FOR EACH ROW EXECUTE FUNCTION public.increment_saves_count();

DROP TRIGGER IF EXISTS trg_comments_counter_ins ON public.comments;
DROP TRIGGER IF EXISTS trg_comments_counter_del ON public.comments;
CREATE TRIGGER trg_comments_counter_ins
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.increment_comments_count();
CREATE TRIGGER trg_comments_counter_del
AFTER DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.increment_comments_count();