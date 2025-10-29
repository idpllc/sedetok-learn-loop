-- Add path_id to quiz_evaluation_events to support learning paths
ALTER TABLE quiz_evaluation_events 
ADD COLUMN path_id uuid REFERENCES learning_paths(id) ON DELETE CASCADE;

-- Add constraint to ensure only one of quiz_id, game_id, or path_id is set
ALTER TABLE quiz_evaluation_events
ADD CONSTRAINT check_single_evaluation_type 
CHECK (
  (quiz_id IS NOT NULL AND game_id IS NULL AND path_id IS NULL) OR
  (quiz_id IS NULL AND game_id IS NOT NULL AND path_id IS NULL) OR
  (quiz_id IS NULL AND game_id IS NULL AND path_id IS NOT NULL)
);

-- Create a table to track path evaluation results
CREATE TABLE IF NOT EXISTS public.user_path_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path_id uuid NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  evaluation_event_id uuid REFERENCES quiz_evaluation_events(id) ON DELETE CASCADE,
  total_items integer NOT NULL DEFAULT 0,
  completed_items integer NOT NULL DEFAULT 0,
  completion_percentage numeric NOT NULL DEFAULT 0,
  passed boolean DEFAULT false,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, path_id, evaluation_event_id)
);

-- Enable RLS on user_path_results
ALTER TABLE public.user_path_results ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own results
CREATE POLICY "Users can view their own path results"
ON public.user_path_results
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own results
CREATE POLICY "Users can insert their own path results"
ON public.user_path_results
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own results
CREATE POLICY "Users can update their own path results"
ON public.user_path_results
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Teachers can view results from their events
CREATE POLICY "Event creators can view path results"
ON public.user_path_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM quiz_evaluation_events qee
    WHERE qee.id = user_path_results.evaluation_event_id
    AND qee.creator_id = auth.uid()
  )
);

-- Policy: Institution staff can view student results
CREATE POLICY "Institution staff can view student path results"
ON public.user_path_results
FOR SELECT
USING (
  can_view_student_data(auth.uid(), user_id)
);

-- Add trigger for updated_at
CREATE TRIGGER update_user_path_results_updated_at
BEFORE UPDATE ON public.user_path_results
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Drop and recreate get_evaluation_event_by_code function to include path_id
DROP FUNCTION IF EXISTS public.get_evaluation_event_by_code(text);

CREATE FUNCTION public.get_evaluation_event_by_code(p_access_code text)
RETURNS TABLE(
  id uuid,
  quiz_id uuid,
  game_id uuid,
  path_id uuid,
  creator_id uuid,
  title text,
  description text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  access_code text,
  require_authentication boolean,
  allow_multiple_attempts boolean,
  show_results_immediately boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qee.id,
    qee.quiz_id,
    qee.game_id,
    qee.path_id,
    qee.creator_id,
    qee.title,
    qee.description,
    qee.start_date,
    qee.end_date,
    qee.access_code,
    qee.require_authentication,
    qee.allow_multiple_attempts,
    qee.show_results_immediately,
    qee.created_at,
    qee.updated_at
  FROM quiz_evaluation_events qee
  WHERE UPPER(qee.access_code) = UPPER(p_access_code);
END;
$$;