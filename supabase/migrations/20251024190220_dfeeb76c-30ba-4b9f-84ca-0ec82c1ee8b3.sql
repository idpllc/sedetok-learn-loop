-- Expose evaluation event by access code regardless of status for UX messaging
CREATE OR REPLACE FUNCTION public.get_evaluation_event_by_code(p_access_code text)
RETURNS TABLE (
  id uuid,
  quiz_id uuid,
  creator_id uuid,
  title text,
  description text,
  start_date timestamptz,
  end_date timestamptz,
  access_code text,
  require_authentication boolean,
  allow_multiple_attempts boolean,
  show_results_immediately boolean,
  created_at timestamptz,
  updated_at timestamptz,
  quizzes jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    e.id,
    e.quiz_id,
    e.creator_id,
    e.title,
    e.description,
    e.start_date,
    e.end_date,
    e.access_code,
    e.require_authentication,
    e.allow_multiple_attempts,
    e.show_results_immediately,
    e.created_at,
    e.updated_at,
    to_jsonb(q) AS quizzes
  FROM public.quiz_evaluation_events e
  JOIN public.quizzes q ON q.id = e.quiz_id
  WHERE e.access_code = UPPER(p_access_code)
  LIMIT 1;
$$;