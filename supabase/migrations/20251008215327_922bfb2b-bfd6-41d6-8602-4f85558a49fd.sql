-- Function to increment comments count
CREATE OR REPLACE FUNCTION increment_comments_count(content_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE content
  SET comments_count = comments_count + 1
  WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement comments count
CREATE OR REPLACE FUNCTION decrement_comments_count(content_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE content
  SET comments_count = GREATEST(comments_count - 1, 0)
  WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment views count
CREATE OR REPLACE FUNCTION increment_views_count(content_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE content
  SET views_count = views_count + 1
  WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment likes count
CREATE OR REPLACE FUNCTION increment_likes_count(content_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE content
  SET likes_count = likes_count + 1
  WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement likes count
CREATE OR REPLACE FUNCTION decrement_likes_count(content_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE content
  SET likes_count = GREATEST(likes_count - 1, 0)
  WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment saves count
CREATE OR REPLACE FUNCTION increment_saves_count(content_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE content
  SET saves_count = saves_count + 1
  WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement saves count
CREATE OR REPLACE FUNCTION decrement_saves_count(content_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE content
  SET saves_count = GREATEST(saves_count - 1, 0)
  WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;