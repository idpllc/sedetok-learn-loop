-- Create trivia categories table based on multiple intelligences
CREATE TABLE IF NOT EXISTS public.trivia_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  intelligence_type TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trivia questions table
CREATE TABLE IF NOT EXISTS public.trivia_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.trivia_categories(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of 4 options
  correct_answer INTEGER NOT NULL CHECK (correct_answer >= 0 AND correct_answer <= 3),
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  points INTEGER NOT NULL DEFAULT 100,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trivia user stats table
CREATE TABLE IF NOT EXISTS public.trivia_user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  total_incorrect INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trivia matches table (game history)
CREATE TABLE IF NOT EXISTS public.trivia_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  points_earned INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  incorrect_answers INTEGER NOT NULL DEFAULT 0,
  questions_answered INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trivia achievements table
CREATE TABLE IF NOT EXISTS public.trivia_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  requirement_type TEXT NOT NULL, -- 'streak', 'category_master', 'total_points', 'matches_played'
  requirement_value INTEGER NOT NULL,
  category_id UUID REFERENCES public.trivia_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trivia user achievements table
CREATE TABLE IF NOT EXISTS public.trivia_user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES public.trivia_achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.trivia_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trivia_categories
CREATE POLICY "Categories are viewable by everyone"
  ON public.trivia_categories FOR SELECT
  USING (true);

CREATE POLICY "Superadmins can manage categories"
  ON public.trivia_categories FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- RLS Policies for trivia_questions
CREATE POLICY "Questions are viewable by everyone"
  ON public.trivia_questions FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can manage questions"
  ON public.trivia_questions FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- RLS Policies for trivia_user_stats
CREATE POLICY "Users can view all stats"
  ON public.trivia_user_stats FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own stats"
  ON public.trivia_user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON public.trivia_user_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for trivia_matches
CREATE POLICY "Users can view all matches for rankings"
  ON public.trivia_matches FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own matches"
  ON public.trivia_matches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for trivia_achievements
CREATE POLICY "Achievements are viewable by everyone"
  ON public.trivia_achievements FOR SELECT
  USING (true);

CREATE POLICY "Superadmins can manage achievements"
  ON public.trivia_achievements FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- RLS Policies for trivia_user_achievements
CREATE POLICY "Users can view all user achievements"
  ON public.trivia_user_achievements FOR SELECT
  USING (true);

CREATE POLICY "Users can earn achievements"
  ON public.trivia_user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Insert default categories based on multiple intelligences
INSERT INTO public.trivia_categories (name, intelligence_type, color, icon, description) VALUES
  ('Lógico-Matemática', 'logical_mathematical', '#4F46E5', '🧮', 'Preguntas de lógica, matemáticas y razonamiento'),
  ('Lingüístico-Verbal', 'linguistic_verbal', '#DC2626', '📚', 'Preguntas de lenguaje, literatura y comunicación'),
  ('Visual-Espacial', 'visual_spatial', '#059669', '🎨', 'Preguntas de arte, diseño y percepción espacial'),
  ('Musical-Rítmica', 'musical_rhythmic', '#9333EA', '🎵', 'Preguntas de música, ritmo y sonido'),
  ('Corporal-Cinestésica', 'bodily_kinesthetic', '#EA580C', '⚽', 'Preguntas de deportes, movimiento y expresión corporal'),
  ('Naturalista', 'naturalist', '#16A34A', '🌿', 'Preguntas de naturaleza, medio ambiente y ciencias naturales'),
  ('Interpersonal', 'interpersonal', '#0EA5E9', '🤝', 'Preguntas de relaciones sociales, empatía y comunicación'),
  ('Intrapersonal', 'intrapersonal', '#8B5CF6', '🧘', 'Preguntas de autoconocimiento, emociones y reflexión'),
  ('Digital-Tecnológica', 'digital_technological', '#06B6D4', '💻', 'Preguntas de tecnología, programación y mundo digital');

-- Insert default achievements
INSERT INTO public.trivia_achievements (name, description, icon, requirement_type, requirement_value) VALUES
  ('Primer Paso', 'Completa tu primera partida', '🎯', 'matches_played', 1),
  ('Racha de Fuego', 'Consigue 5 respuestas correctas seguidas', '🔥', 'streak', 5),
  ('Racha Imparable', 'Consigue 10 respuestas correctas seguidas', '⚡', 'streak', 10),
  ('Maestro Trivia', 'Alcanza 1000 puntos totales', '👑', 'total_points', 1000),
  ('Leyenda Trivia', 'Alcanza 5000 puntos totales', '🏆', 'total_points', 5000),
  ('Veterano', 'Juega 50 partidas', '🎖️', 'matches_played', 50),
  ('Campeón', 'Juega 100 partidas', '🥇', 'matches_played', 100);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_trivia_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trivia_questions_updated_at
  BEFORE UPDATE ON public.trivia_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_trivia_updated_at();

CREATE TRIGGER update_trivia_user_stats_updated_at
  BEFORE UPDATE ON public.trivia_user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_trivia_updated_at();