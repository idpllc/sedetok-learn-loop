-- Fix the award_xp_for_upload function to use correct column name
DROP FUNCTION IF EXISTS public.award_xp_for_upload(uuid, uuid);

CREATE OR REPLACE FUNCTION public.award_xp_for_upload(p_user_id uuid, p_content_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_already_awarded BOOLEAN;
BEGIN
  -- Check if XP has already been awarded for this content upload
  SELECT EXISTS (
    SELECT 1 FROM user_xp_log
    WHERE user_id = p_user_id
    AND content_id = p_content_id
    AND action_type = 'content_upload'
  ) INTO v_already_awarded;

  -- If already awarded, return false
  IF v_already_awarded THEN
    RETURN FALSE;
  END IF;

  -- Award 1000 XP for content upload
  INSERT INTO user_xp_log (user_id, content_id, action_type, xp_amount)
  VALUES (p_user_id, p_content_id, 'content_upload', 1000);

  -- Update user's total XP
  UPDATE profiles
  SET experience_points = COALESCE(experience_points, 0) + 1000
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$function$;

-- Create function to award XP for quiz creation
CREATE OR REPLACE FUNCTION public.award_xp_for_quiz_creation(p_user_id uuid, p_quiz_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_already_awarded BOOLEAN;
BEGIN
  -- Check if XP has already been awarded for this quiz creation
  SELECT EXISTS (
    SELECT 1 FROM user_xp_log
    WHERE user_id = p_user_id
    AND quiz_id = p_quiz_id
    AND action_type = 'quiz_creation'
  ) INTO v_already_awarded;

  -- If already awarded, return false
  IF v_already_awarded THEN
    RETURN FALSE;
  END IF;

  -- Award 1500 XP for quiz creation
  INSERT INTO user_xp_log (user_id, quiz_id, action_type, xp_amount)
  VALUES (p_user_id, p_quiz_id, 'quiz_creation', 1500);

  -- Update user's total XP
  UPDATE profiles
  SET experience_points = COALESCE(experience_points, 0) + 1500
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$function$;

-- Create function to award XP for learning path creation
CREATE OR REPLACE FUNCTION public.award_xp_for_path_creation(p_user_id uuid, p_path_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_already_awarded BOOLEAN;
BEGIN
  -- Check if XP has already been awarded for this path creation
  SELECT EXISTS (
    SELECT 1 FROM user_xp_log
    WHERE user_id = p_user_id
    AND content_id = p_path_id
    AND action_type = 'path_creation'
  ) INTO v_already_awarded;

  -- If already awarded, return false
  IF v_already_awarded THEN
    RETURN FALSE;
  END IF;

  -- Award 3000 XP for learning path creation
  INSERT INTO user_xp_log (user_id, content_id, action_type, xp_amount)
  VALUES (p_user_id, p_path_id, 'path_creation', 3000);

  -- Update user's total XP
  UPDATE profiles
  SET experience_points = COALESCE(experience_points, 0) + 3000
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$function$;