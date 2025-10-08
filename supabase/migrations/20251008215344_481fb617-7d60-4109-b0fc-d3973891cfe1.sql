-- Drop existing functions
DROP FUNCTION IF EXISTS increment_comments_count(UUID);
DROP FUNCTION IF EXISTS decrement_comments_count(UUID);
DROP FUNCTION IF EXISTS increment_views_count(UUID);
DROP FUNCTION IF EXISTS increment_likes_count(UUID);
DROP FUNCTION IF EXISTS decrement_likes_count(UUID);
DROP FUNCTION IF EXISTS increment_saves_count(UUID);
DROP FUNCTION IF EXISTS decrement_saves_count(UUID);

-- Function to increment comments count with secure search_path
CREATE OR REPLACE FUNCTION increment_comments_count(content_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE content
  SET comments_count = comments_count + 1
  WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to decrement comments count with secure search_path
CREATE OR REPLACE FUNCTION decrement_comments_count(content_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE content
  SET comments_count = GREATEST(comments_count - 1, 0)
  WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to increment views count with secure search_path
CREATE OR REPLACE FUNCTION increment_views_count(content_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE content
  SET views_count = views_count + 1
  WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to increment likes count with secure search_path
CREATE OR REPLACE FUNCTION increment_likes_count(content_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE content
  SET likes_count = likes_count + 1
  WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to decrement likes count with secure search_path
CREATE OR REPLACE FUNCTION decrement_likes_count(content_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE content
  SET likes_count = GREATEST(likes_count - 1, 0)
  WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to increment saves count with secure search_path
CREATE OR REPLACE FUNCTION increment_saves_count(content_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE content
  SET saves_count = saves_count + 1
  WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to decrement saves count with secure search_path
CREATE OR REPLACE FUNCTION decrement_saves_count(content_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE content
  SET saves_count = GREATEST(saves_count - 1, 0)
  WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;