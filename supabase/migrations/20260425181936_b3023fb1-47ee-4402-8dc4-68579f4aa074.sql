ALTER TABLE public.quiz_evaluation_events
  ADD COLUMN IF NOT EXISTS show_answers_after_completion boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS disable_helpers boolean NOT NULL DEFAULT true;