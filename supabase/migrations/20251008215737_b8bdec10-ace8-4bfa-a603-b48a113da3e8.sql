-- Create triggers to automatically update counters

-- Trigger for comments insert
CREATE OR REPLACE FUNCTION increment_comments_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE content
  SET comments_count = comments_count + 1
  WHERE id = NEW.content_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_comment_insert
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION increment_comments_trigger();

-- Trigger for comments delete
CREATE OR REPLACE FUNCTION decrement_comments_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE content
  SET comments_count = GREATEST(comments_count - 1, 0)
  WHERE id = OLD.content_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_comment_delete
AFTER DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION decrement_comments_trigger();

-- Trigger for likes insert
CREATE OR REPLACE FUNCTION increment_likes_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE content
  SET likes_count = likes_count + 1
  WHERE id = NEW.content_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_like_insert
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION increment_likes_trigger();

-- Trigger for likes delete
CREATE OR REPLACE FUNCTION decrement_likes_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE content
  SET likes_count = GREATEST(likes_count - 1, 0)
  WHERE id = OLD.content_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_like_delete
AFTER DELETE ON likes
FOR EACH ROW
EXECUTE FUNCTION decrement_likes_trigger();

-- Trigger for saves insert
CREATE OR REPLACE FUNCTION increment_saves_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE content
  SET saves_count = saves_count + 1
  WHERE id = NEW.content_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_save_insert
AFTER INSERT ON saves
FOR EACH ROW
EXECUTE FUNCTION increment_saves_trigger();

-- Trigger for saves delete
CREATE OR REPLACE FUNCTION decrement_saves_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE content
  SET saves_count = GREATEST(saves_count - 1, 0)
  WHERE id = OLD.content_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_save_delete
AFTER DELETE ON saves
FOR EACH ROW
EXECUTE FUNCTION decrement_saves_trigger();