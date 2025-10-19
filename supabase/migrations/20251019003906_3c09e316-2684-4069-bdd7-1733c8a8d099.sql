-- Fix XP logging to avoid foreign key violations when handling quizzes and learning paths
-- 1) Remove obsolete 3-arg overload to prevent accidental inserts into content_id
DROP FUNCTION IF EXISTS public.award_xp_for_action(uuid, uuid, text);

-- 2) Ensure quiz completion XP logs to quiz_id and attach trigger
CREATE OR REPLACE FUNCTION public.award_quiz_completion_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.passed = true THEN
    INSERT INTO user_xp_log (user_id, quiz_id, action_type, xp_amount)
    VALUES (NEW.user_id, NEW.quiz_id, 'quiz_complete', 50)
    ON CONFLICT DO NOTHING;

    UPDATE profiles
    SET experience_points = COALESCE(experience_points, 0) + 50
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger (idempotent)
DROP TRIGGER IF EXISTS trg_award_quiz_completion_xp ON public.user_quiz_results;
CREATE TRIGGER trg_award_quiz_completion_xp
AFTER INSERT ON public.user_quiz_results
FOR EACH ROW
EXECUTE FUNCTION public.award_quiz_completion_xp();

-- 3) Add path_id to user_xp_log for learning paths and use it instead of content_id
ALTER TABLE public.user_xp_log ADD COLUMN IF NOT EXISTS path_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_xp_log_path_id_fkey'
  ) THEN
    ALTER TABLE public.user_xp_log
    ADD CONSTRAINT user_xp_log_path_id_fkey
    FOREIGN KEY (path_id) REFERENCES public.learning_paths (id) ON DELETE SET NULL;
  END IF;
END$$;

-- Update path creation XP to write to path_id
CREATE OR REPLACE FUNCTION public.award_xp_for_path_creation(p_user_id uuid, p_path_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_already_awarded BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_xp_log
    WHERE user_id = p_user_id
      AND path_id = p_path_id
      AND action_type = 'path_creation'
  ) INTO v_already_awarded;

  IF v_already_awarded THEN
    RETURN FALSE;
  END IF;

  INSERT INTO user_xp_log (user_id, path_id, action_type, xp_amount)
  VALUES (p_user_id, p_path_id, 'path_creation', 3000);

  UPDATE profiles
  SET experience_points = COALESCE(experience_points, 0) + 3000
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$function$;

-- Update path completion XP to write to path_id
CREATE OR REPLACE FUNCTION public.check_and_award_path_completion_xp(p_user_id uuid, p_path_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_required integer;
  v_completed_count integer;
  v_already_awarded boolean;
  v_path_complete boolean;
BEGIN
  SELECT COUNT(*) INTO v_total_required
  FROM learning_path_content
  WHERE path_id = p_path_id AND is_required = true;

  SELECT COUNT(DISTINCT COALESCE(upp.content_id::text, upp.quiz_id::text))
  INTO v_completed_count
  FROM user_path_progress upp
  INNER JOIN learning_path_content lpc ON (
    (upp.content_id = lpc.content_id OR upp.quiz_id = lpc.quiz_id)
    AND upp.path_id = lpc.path_id
  )
  WHERE upp.user_id = p_user_id
    AND upp.path_id = p_path_id
    AND upp.completed = true
    AND lpc.is_required = true;

  v_path_complete := (v_total_required > 0 AND v_completed_count >= v_total_required);
  IF NOT v_path_complete THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM user_xp_log
    WHERE user_id = p_user_id 
      AND path_id = p_path_id
      AND action_type = 'path_complete'
  ) INTO v_already_awarded;

  IF NOT v_already_awarded THEN
    INSERT INTO user_xp_log (user_id, path_id, action_type, xp_amount)
    VALUES (p_user_id, p_path_id, 'path_complete', 1000);

    UPDATE profiles
    SET experience_points = COALESCE(experience_points, 0) + 1000
    WHERE id = p_user_id;

    RETURN true;
  END IF;

  RETURN false;
END;
$function$;