DROP POLICY IF EXISTS "Anyone can view events by access code" ON public.quiz_evaluation_events;
REVOKE SELECT ON public.quiz_evaluation_events FROM anon;
GRANT EXECUTE ON FUNCTION public.get_evaluation_event_by_code(text) TO anon, authenticated;
