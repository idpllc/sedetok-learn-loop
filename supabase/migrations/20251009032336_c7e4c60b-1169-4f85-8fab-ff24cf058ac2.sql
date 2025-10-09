-- Add RLS policies for quiz_questions INSERT, UPDATE, DELETE
-- Users can create questions for their own quizzes
CREATE POLICY "Quiz creators can create questions"
  ON public.quiz_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = quiz_questions.content_id
      AND quizzes.creator_id = auth.uid()
    )
  );

-- Users can update questions in their own quizzes
CREATE POLICY "Quiz creators can update questions"
  ON public.quiz_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = quiz_questions.content_id
      AND quizzes.creator_id = auth.uid()
    )
  );

-- Users can delete questions in their own quizzes
CREATE POLICY "Quiz creators can delete questions"
  ON public.quiz_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = quiz_questions.content_id
      AND quizzes.creator_id = auth.uid()
    )
  );