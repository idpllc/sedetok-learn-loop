-- Create function to award XP for content upload
CREATE OR REPLACE FUNCTION public.award_xp_for_upload(
  p_user_id UUID,
  p_content_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  INSERT INTO user_xp_log (user_id, content_id, action_type, xp_earned)
  VALUES (p_user_id, p_content_id, 'content_upload', 1000);

  -- Update user's total XP
  UPDATE profiles
  SET experience_points = COALESCE(experience_points, 0) + 1000
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$;