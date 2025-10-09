-- Modify user_xp_log to support both content and quizzes
ALTER TABLE public.user_xp_log
ADD COLUMN quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE;

-- Make content_id nullable
ALTER TABLE public.user_xp_log
ALTER COLUMN content_id DROP NOT NULL;

-- Add check constraint to ensure either content_id or quiz_id is present
ALTER TABLE public.user_xp_log
ADD CONSTRAINT user_xp_log_content_or_quiz_check 
CHECK (
  (content_id IS NOT NULL AND quiz_id IS NULL) OR 
  (content_id IS NULL AND quiz_id IS NOT NULL)
);

-- Update the award_xp_for_action function to support quizzes
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
BEGIN
  -- Define XP amounts per action
  v_xp_amount := CASE p_action_type
    WHEN 'view_complete' THEN 5
    WHEN 'like' THEN 10
    WHEN 'save' THEN 15
    WHEN 'comment' THEN 20
    ELSE 0
  END;
  
  -- Check if user already got XP for this action on this content/quiz
  IF p_is_quiz THEN
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
  
  -- Only award if not already awarded
  IF NOT v_already_awarded AND v_xp_amount > 0 THEN
    -- Log the XP award
    IF p_is_quiz THEN
      INSERT INTO user_xp_log (user_id, quiz_id, action_type, xp_amount)
      VALUES (p_user_id, p_content_id, p_action_type, v_xp_amount);
    ELSE
      INSERT INTO user_xp_log (user_id, content_id, action_type, xp_amount)
      VALUES (p_user_id, p_content_id, p_action_type, v_xp_amount);
    END IF;
    
    -- Update user's total XP
    UPDATE profiles
    SET experience_points = experience_points + v_xp_amount
    WHERE id = p_user_id;
  END IF;
END;
$function$;