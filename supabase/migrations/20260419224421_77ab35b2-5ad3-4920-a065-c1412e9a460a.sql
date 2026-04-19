-- Update award_xp_for_action to support games (avoid FK violation when storing game_id in quiz_id)
CREATE OR REPLACE FUNCTION public.award_xp_for_action(
  p_user_id uuid,
  p_content_id uuid,
  p_action_type text,
  p_is_quiz boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_xp_amount integer;
  v_already_awarded boolean;
  v_is_game boolean := false;
BEGIN
  v_xp_amount := CASE p_action_type
    WHEN 'view_complete' THEN 5
    WHEN 'like' THEN 10
    WHEN 'save' THEN 15
    WHEN 'comment' THEN 20
    ELSE 0
  END;

  -- Detect if the id corresponds to a game (so we don't violate quiz_id FK)
  IF p_is_quiz THEN
    SELECT EXISTS(SELECT 1 FROM games WHERE id = p_content_id) INTO v_is_game;
  END IF;

  IF v_is_game THEN
    SELECT EXISTS (
      SELECT 1 FROM user_xp_log
      WHERE user_id = p_user_id
        AND game_id = p_content_id
        AND action_type = p_action_type
    ) INTO v_already_awarded;
  ELSIF p_is_quiz THEN
    SELECT EXISTS (
      SELECT 1 FROM user_xp_log
      WHERE user_id = p_user_id
        AND quiz_id = p_content_id
        AND action_type = p_action_type
    ) INTO v_already_awarded;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM user_xp_log
      WHERE user_id = p_user_id
        AND content_id = p_content_id
        AND action_type = p_action_type
    ) INTO v_already_awarded;
  END IF;

  IF NOT v_already_awarded AND v_xp_amount > 0 THEN
    IF v_is_game THEN
      INSERT INTO user_xp_log (user_id, game_id, action_type, xp_amount)
      VALUES (p_user_id, p_content_id, p_action_type, v_xp_amount);
    ELSIF p_is_quiz THEN
      INSERT INTO user_xp_log (user_id, quiz_id, action_type, xp_amount)
      VALUES (p_user_id, p_content_id, p_action_type, v_xp_amount);
    ELSE
      INSERT INTO user_xp_log (user_id, content_id, action_type, xp_amount)
      VALUES (p_user_id, p_content_id, p_action_type, v_xp_amount);
    END IF;

    UPDATE profiles
    SET experience_points = experience_points + v_xp_amount
    WHERE id = p_user_id;
  END IF;
END;
$function$;