-- Create table for quiz evaluation events
CREATE TABLE public.quiz_evaluation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  access_code TEXT NOT NULL UNIQUE,
  require_authentication BOOLEAN DEFAULT true,
  allow_multiple_attempts BOOLEAN DEFAULT false,
  show_results_immediately BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add evaluation_event_id to user_quiz_results to link results with events
ALTER TABLE public.user_quiz_results 
ADD COLUMN evaluation_event_id UUID REFERENCES public.quiz_evaluation_events(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.quiz_evaluation_events ENABLE ROW LEVEL SECURITY;

-- Policy: Event creators can manage their events
CREATE POLICY "Event creators can manage their events"
ON public.quiz_evaluation_events
FOR ALL
USING (auth.uid() = creator_id)
WITH CHECK (auth.uid() = creator_id);

-- Policy: Anyone can view active events with access code (for taking the quiz)
CREATE POLICY "Anyone can view events by access code"
ON public.quiz_evaluation_events
FOR SELECT
USING (
  start_date <= now() AND 
  end_date >= now()
);

-- Function to generate unique access code
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_quiz_evaluation_events_updated_at
BEFORE UPDATE ON public.quiz_evaluation_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster access code lookups
CREATE INDEX idx_quiz_evaluation_events_access_code ON public.quiz_evaluation_events(access_code);
CREATE INDEX idx_user_quiz_results_evaluation_event ON public.user_quiz_results(evaluation_event_id);