-- Crear función para actualizar el contador de seguidores
CREATE OR REPLACE FUNCTION update_followers_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Incrementar followers_count del usuario que está siendo seguido
    UPDATE profiles
    SET followers_count = followers_count + 1
    WHERE id = NEW.following_id;
    
    -- Incrementar following_count del usuario que está siguiendo
    UPDATE profiles
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrementar followers_count del usuario que era seguido
    UPDATE profiles
    SET followers_count = GREATEST(followers_count - 1, 0)
    WHERE id = OLD.following_id;
    
    -- Decrementar following_count del usuario que dejó de seguir
    UPDATE profiles
    SET following_count = GREATEST(following_count - 1, 0)
    WHERE id = OLD.follower_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para actualizar contadores al seguir/dejar de seguir
DROP TRIGGER IF EXISTS follows_update_counts_trigger ON follows;
CREATE TRIGGER follows_update_counts_trigger
AFTER INSERT OR DELETE ON follows
FOR EACH ROW
EXECUTE FUNCTION update_followers_count();

-- Actualizar contadores existentes basándose en los datos actuales
UPDATE profiles
SET followers_count = (
  SELECT COUNT(*)
  FROM follows
  WHERE follows.following_id = profiles.id
),
following_count = (
  SELECT COUNT(*)
  FROM follows
  WHERE follows.follower_id = profiles.id
);