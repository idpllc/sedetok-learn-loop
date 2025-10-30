-- Add 'open_ended' to question_type enum
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'open_ended';

-- Create table for open-ended responses
CREATE TABLE IF NOT EXISTS public.user_open_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  evaluation_event_id UUID REFERENCES quiz_evaluation_events(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  ai_score NUMERIC,
  ai_feedback TEXT,
  teacher_score NUMERIC,
  teacher_feedback TEXT,
  max_score NUMERIC NOT NULL DEFAULT 100,
  evaluated_at TIMESTAMP WITH TIME ZONE,
  teacher_reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, question_id, evaluation_event_id)
);

-- Enable RLS
ALTER TABLE public.user_open_responses ENABLE ROW LEVEL SECURITY;

-- Users can insert their own responses
CREATE POLICY "Users can insert own open responses"
ON public.user_open_responses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own responses
CREATE POLICY "Users can view own open responses"
ON public.user_open_responses
FOR SELECT
USING (auth.uid() = user_id);

-- Quiz creators can view responses to their quizzes
CREATE POLICY "Quiz creators can view responses"
ON public.user_open_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM quizzes
    WHERE quizzes.id = user_open_responses.quiz_id
    AND quizzes.creator_id = auth.uid()
  )
);

-- Event creators can view responses to their events
CREATE POLICY "Event creators can view responses"
ON public.user_open_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM quiz_evaluation_events qee
    WHERE qee.id = user_open_responses.evaluation_event_id
    AND qee.creator_id = auth.uid()
  )
);

-- Quiz/Event creators can update scores and feedback
CREATE POLICY "Creators can update scores and feedback"
ON public.user_open_responses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM quizzes
    WHERE quizzes.id = user_open_responses.quiz_id
    AND quizzes.creator_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM quiz_evaluation_events qee
    WHERE qee.id = user_open_responses.evaluation_event_id
    AND qee.creator_id = auth.uid()
  )
);

-- Institution staff can view student responses
CREATE POLICY "Institution staff can view student responses"
ON public.user_open_responses
FOR SELECT
USING (can_view_student_data(auth.uid(), user_id));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_open_responses_user_id ON public.user_open_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_open_responses_quiz_id ON public.user_open_responses(quiz_id);
CREATE INDEX IF NOT EXISTS idx_user_open_responses_question_id ON public.user_open_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_user_open_responses_evaluation_event_id ON public.user_open_responses(evaluation_event_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_open_responses_updated_at
BEFORE UPDATE ON public.user_open_responses
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add expected_answer and evaluation_criteria fields to quiz_questions for open-ended questions
ALTER TABLE public.quiz_questions 
ADD COLUMN IF NOT EXISTS expected_answer TEXT,
ADD COLUMN IF NOT EXISTS evaluation_criteria TEXT;