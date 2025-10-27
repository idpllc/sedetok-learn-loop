-- Drop all existing triggers first
DROP TRIGGER IF EXISTS award_xp_on_quiz_completion ON user_quiz_results;
DROP TRIGGER IF EXISTS trg_award_quiz_completion_xp ON user_quiz_results;
DROP TRIGGER IF EXISTS award_quiz_completion_xp_trigger ON user_quiz_results;

-- Drop existing function
DROP FUNCTION IF EXISTS award_quiz_completion_xp();

-- Create improved function that handles both quizzes and games
CREATE OR REPLACE FUNCTION public.award_quiz_game_completion_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_xp_amount integer;
  v_action_type text;
  v_already_awarded boolean;
BEGIN
  -- Determine XP amount and action type based on whether it's a quiz or game
  IF NEW.quiz_id IS NOT NULL THEN
    v_xp_amount := 50;
    v_action_type := 'quiz_complete';
    
    -- Check if already awarded for this quiz
    SELECT EXISTS (
      SELECT 1 FROM user_xp_log
      WHERE user_id = NEW.user_id 
        AND quiz_id = NEW.quiz_id 
        AND action_type = v_action_type
    ) INTO v_already_awarded;
    
    -- Award XP if passed and not already awarded
    IF NEW.passed = true AND NOT v_already_awarded THEN
      INSERT INTO user_xp_log (user_id, quiz_id, action_type, xp_amount)
      VALUES (NEW.user_id, NEW.quiz_id, v_action_type, v_xp_amount);

      UPDATE profiles
      SET experience_points = COALESCE(experience_points, 0) + v_xp_amount
      WHERE id = NEW.user_id;
    END IF;
    
  ELSIF NEW.game_id IS NOT NULL THEN
    v_xp_amount := 100;
    v_action_type := 'game_complete';
    
    -- Check if already awarded for this game
    SELECT EXISTS (
      SELECT 1 FROM user_xp_log
      WHERE user_id = NEW.user_id 
        AND game_id = NEW.game_id 
        AND action_type = v_action_type
    ) INTO v_already_awarded;
    
    -- Award XP if passed and not already awarded
    IF NEW.passed = true AND NOT v_already_awarded THEN
      INSERT INTO user_xp_log (user_id, game_id, action_type, xp_amount)
      VALUES (NEW.user_id, NEW.game_id, v_action_type, v_xp_amount);

      UPDATE profiles
      SET experience_points = COALESCE(experience_points, 0) + v_xp_amount
      WHERE id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger for both quiz and game completion
CREATE TRIGGER award_quiz_game_completion_xp_trigger
  AFTER INSERT ON user_quiz_results
  FOR EACH ROW
  EXECUTE FUNCTION award_quiz_game_completion_xp();