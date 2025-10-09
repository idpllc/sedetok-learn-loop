-- Create enum for quiz difficulty level
CREATE TYPE quiz_difficulty AS ENUM ('basico', 'intermedio', 'avanzado');

-- Create enum for quiz status
CREATE TYPE quiz_status AS ENUM ('borrador', 'publicado');

-- Create enum for question types
CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false', 'short_answer', 'matching', 'ordering');

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category category_type NOT NULL,
  grade_level grade_level NOT NULL,
  difficulty quiz_difficulty NOT NULL DEFAULT 'basico',
  is_public BOOLEAN DEFAULT true,
  status quiz_status DEFAULT 'borrador',
  time_limit INTEGER, -- in minutes
  random_order BOOLEAN DEFAULT false,
  final_message TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Update existing quiz_questions table to support more question types
ALTER TABLE public.quiz_questions 
  ADD COLUMN IF NOT EXISTS question_type question_type DEFAULT 'multiple_choice',
  ADD COLUMN IF NOT EXISTS feedback TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Create quiz_options table for question options
CREATE TABLE public.quiz_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_quiz_results table
CREATE TABLE public.user_quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  time_taken INTEGER, -- in seconds
  passed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quiz_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quizzes
CREATE POLICY "Public quizzes are viewable by everyone"
  ON public.quizzes FOR SELECT
  USING (is_public = true OR auth.uid() = creator_id);

CREATE POLICY "Users can create quizzes"
  ON public.quizzes FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own quizzes"
  ON public.quizzes FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete own quizzes"
  ON public.quizzes FOR DELETE
  USING (auth.uid() = creator_id);

-- RLS Policies for quiz_options
CREATE POLICY "Quiz options are viewable by everyone"
  ON public.quiz_options FOR SELECT
  USING (true);

CREATE POLICY "Quiz creators can manage options"
  ON public.quiz_options FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM quiz_questions qq
      JOIN quizzes q ON qq.content_id = q.id
      WHERE qq.id = quiz_options.question_id
      AND q.creator_id = auth.uid()
    )
  );

-- RLS Policies for user_quiz_results
CREATE POLICY "Users can view own quiz results"
  ON public.user_quiz_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create quiz results"
  ON public.user_quiz_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to award XP for quiz completion
CREATE OR REPLACE FUNCTION award_quiz_completion_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Award 50 XP for completing a quiz
  IF NEW.passed = true THEN
    INSERT INTO user_xp_log (user_id, content_id, action_type, xp_amount)
    VALUES (NEW.user_id, NEW.quiz_id, 'quiz_complete', 50)
    ON CONFLICT DO NOTHING;
    
    UPDATE profiles
    SET experience_points = experience_points + 50
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER award_xp_on_quiz_completion
  AFTER INSERT ON public.user_quiz_results
  FOR EACH ROW
  EXECUTE FUNCTION award_quiz_completion_xp();