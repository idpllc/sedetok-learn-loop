-- Add 'game' to content_type enum
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'game';

-- Create games table
CREATE TABLE IF NOT EXISTS public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category category_type NOT NULL,
  grade_level grade_level NOT NULL,
  subject TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  thumbnail_url TEXT,
  game_type TEXT NOT NULL DEFAULT 'word_order',
  is_public BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'draft',
  time_limit INTEGER,
  random_order BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create game questions table for word ordering game
CREATE TABLE IF NOT EXISTS public.game_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  correct_sentence TEXT NOT NULL,
  words JSONB NOT NULL DEFAULT '[]'::jsonb,
  points INTEGER DEFAULT 10,
  order_index INTEGER NOT NULL,
  image_url TEXT,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for games
CREATE POLICY "Public games are viewable by everyone"
ON public.games FOR SELECT
USING (is_public = true OR auth.uid() = creator_id);

CREATE POLICY "Users can create games"
ON public.games FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own games"
ON public.games FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete own games"
ON public.games FOR DELETE
USING (auth.uid() = creator_id);

CREATE POLICY "Superadmins can manage all games"
ON public.games FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- RLS Policies for game_questions
CREATE POLICY "Game questions are viewable by everyone"
ON public.game_questions FOR SELECT
USING (true);

CREATE POLICY "Game creators can create questions"
ON public.game_questions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM games
    WHERE games.id = game_questions.game_id
    AND games.creator_id = auth.uid()
  )
);

CREATE POLICY "Game creators can update questions"
ON public.game_questions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM games
    WHERE games.id = game_questions.game_id
    AND games.creator_id = auth.uid()
  )
);

CREATE POLICY "Game creators can delete questions"
ON public.game_questions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM games
    WHERE games.id = game_questions.game_id
    AND games.creator_id = auth.uid()
  )
);