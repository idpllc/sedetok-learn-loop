-- Create function to award XP for actions
CREATE OR REPLACE FUNCTION public.award_xp_for_action(
  p_user_id uuid,
  p_content_id uuid,
  p_action_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- Check if user already got XP for this action on this content
  SELECT EXISTS (
    SELECT 1 FROM user_xp_log
    WHERE user_id = p_user_id 
      AND content_id = p_content_id 
      AND action_type = p_action_type
  ) INTO v_already_awarded;
  
  -- Only award if not already awarded
  IF NOT v_already_awarded AND v_xp_amount > 0 THEN
    -- Log the XP award
    INSERT INTO user_xp_log (user_id, content_id, action_type, xp_amount)
    VALUES (p_user_id, p_content_id, p_action_type, v_xp_amount);
    
    -- Update user's total XP
    UPDATE profiles
    SET experience_points = experience_points + v_xp_amount
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- Create table to track XP awards and prevent duplicates
CREATE TABLE IF NOT EXISTS public.user_xp_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  xp_amount integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, content_id, action_type)
);

ALTER TABLE public.user_xp_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own XP log"
  ON public.user_xp_log FOR SELECT
  USING (auth.uid() = user_id);