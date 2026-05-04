
-- Add new preference columns
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS email_level_up boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_path_enrollment boolean DEFAULT true;

-- Helper function to compute level from XP (mirrors src/lib/xpLevels.ts thresholds)
CREATE OR REPLACE FUNCTION public.compute_xp_level(_xp integer)
RETURNS TABLE(level_index integer, level_name text, level_icon text)
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH levels(idx, name, icon, threshold) AS (
    VALUES
      (0, 'Principiante', '🌱', 0),
      (1, 'Estudiante', '📚', 500),
      (2, 'Explorador', '🔍', 2000),
      (3, 'Investigador', '🔬', 5000),
      (4, 'Experto', '💡', 10000),
      (5, 'Maestro', '🎓', 25000),
      (6, 'Sabio', '📖', 50000),
      (7, 'Erudito', '🧠', 100000),
      (8, 'Virtuoso', '🎯', 250000),
      (9, 'Prodigio', '💫', 500000),
      (10, 'Genio', '🌟', 1000000),
      (11, 'Leyenda', '👑', 2500000)
  )
  SELECT idx, name, icon
  FROM levels
  WHERE threshold <= COALESCE(_xp, 0)
  ORDER BY threshold DESC
  LIMIT 1;
$$;

-- Trigger function for level-up
CREATE OR REPLACE FUNCTION public.notify_on_level_up()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_level RECORD;
  v_new_level RECORD;
BEGIN
  IF COALESCE(NEW.experience_points, 0) <= COALESCE(OLD.experience_points, 0) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_old_level FROM public.compute_xp_level(COALESCE(OLD.experience_points, 0));
  SELECT * INTO v_new_level FROM public.compute_xp_level(COALESCE(NEW.experience_points, 0));

  IF v_new_level.level_index IS DISTINCT FROM v_old_level.level_index
     AND v_new_level.level_index > COALESCE(v_old_level.level_index, -1) THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_type)
    VALUES (
      NEW.id,
      'level_up',
      v_new_level.level_icon || ' ¡Nuevo nivel: ' || v_new_level.level_name || '!',
      'Felicitaciones, has alcanzado el nivel ' || v_new_level.level_name || ' con ' || NEW.experience_points || ' XP. ¡Sigue así!',
      'level'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_level_up ON public.profiles;
CREATE TRIGGER trg_notify_on_level_up
AFTER UPDATE OF experience_points ON public.profiles
FOR EACH ROW
WHEN (NEW.experience_points IS DISTINCT FROM OLD.experience_points)
EXECUTE FUNCTION public.notify_on_level_up();

-- Trigger function for path enrollment
CREATE OR REPLACE FUNCTION public.notify_on_path_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id uuid;
  v_path_title text;
  v_enroller_name text;
BEGIN
  SELECT creator_id, title INTO v_creator_id, v_path_title
  FROM public.learning_paths WHERE id = NEW.path_id;

  IF v_creator_id IS NULL OR v_creator_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(full_name, ''), username, 'Un estudiante')
  INTO v_enroller_name
  FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type)
  VALUES (
    v_creator_id,
    'path_enrollment',
    '🚀 Nueva inscripción en tu ruta',
    v_enroller_name || ' se ha inscrito en tu ruta "' || COALESCE(v_path_title, 'tu ruta') || '".',
    NEW.path_id,
    'learning_path'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_path_enrollment ON public.path_enrollments;
CREATE TRIGGER trg_notify_on_path_enrollment
AFTER INSERT ON public.path_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_path_enrollment();
