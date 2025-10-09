-- Function to check if a learning path is complete and award XP
CREATE OR REPLACE FUNCTION public.check_and_award_path_completion_xp(
  p_user_id uuid,
  p_path_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_required integer;
  v_completed_count integer;
  v_already_awarded boolean;
  v_path_complete boolean;
BEGIN
  -- Count total required content items in the path
  SELECT COUNT(*)
  INTO v_total_required
  FROM learning_path_content
  WHERE path_id = p_path_id
    AND is_required = true;
  
  -- Count how many required items the user has completed
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
  
  -- Check if path is complete
  v_path_complete := (v_total_required > 0 AND v_completed_count >= v_total_required);
  
  IF NOT v_path_complete THEN
    RETURN false;
  END IF;
  
  -- Check if XP was already awarded for this path completion
  SELECT EXISTS (
    SELECT 1 FROM user_xp_log
    WHERE user_id = p_user_id 
      AND content_id = p_path_id
      AND action_type = 'path_complete'
  ) INTO v_already_awarded;
  
  -- Award XP if not already awarded
  IF NOT v_already_awarded THEN
    -- Log the XP award (using content_id field for path_id)
    INSERT INTO user_xp_log (user_id, content_id, action_type, xp_amount)
    VALUES (p_user_id, p_path_id, 'path_complete', 1000);
    
    -- Update user's total XP
    UPDATE profiles
    SET experience_points = experience_points + 1000
    WHERE id = p_user_id;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;