-- Agregar política RLS para que los creadores de eventos puedan ver los resultados
CREATE POLICY "Event creators can view results"
ON public.user_quiz_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM quiz_evaluation_events
    WHERE quiz_evaluation_events.id = user_quiz_results.evaluation_event_id
    AND quiz_evaluation_events.creator_id = auth.uid()
  )
);