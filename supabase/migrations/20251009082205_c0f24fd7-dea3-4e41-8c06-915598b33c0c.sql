-- Create user path progress table to track completion
CREATE TABLE IF NOT EXISTS public.user_path_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  progress_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, path_id, content_id, quiz_id),
  CHECK (
    (content_id IS NOT NULL AND quiz_id IS NULL) OR
    (content_id IS NULL AND quiz_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.user_path_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own progress
CREATE POLICY "Users can view own progress"
ON public.user_path_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress"
ON public.user_path_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress"
ON public.user_path_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_user_path_progress_user_path ON public.user_path_progress(user_id, path_id);
CREATE INDEX idx_user_path_progress_content ON public.user_path_progress(content_id);
CREATE INDEX idx_user_path_progress_quiz ON public.user_path_progress(quiz_id);

-- Trigger to update updated_at
CREATE TRIGGER update_user_path_progress_updated_at
BEFORE UPDATE ON public.user_path_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();