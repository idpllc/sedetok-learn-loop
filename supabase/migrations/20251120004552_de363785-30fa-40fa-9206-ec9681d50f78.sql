-- Create tables for Live Games module (Kahoot-style)

-- Table for live game sessions
CREATE TABLE public.live_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE SET NULL,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  pin TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, in_progress, finished
  current_question_index INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
  subject TEXT,
  grade_level grade_level
);

-- Table for players in a live game
CREATE TABLE public.live_game_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES live_games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  player_name TEXT NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(game_id, user_id)
);

-- Table for questions in a live game
CREATE TABLE public.live_game_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES live_games(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 1000,
  time_limit INTEGER NOT NULL DEFAULT 20,
  order_index INTEGER NOT NULL,
  image_url TEXT,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for player answers
CREATE TABLE public.live_game_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES live_game_players(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES live_game_questions(id) ON DELETE CASCADE,
  selected_answer INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id, question_id)
);

-- Enable RLS
ALTER TABLE public.live_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_game_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_games
CREATE POLICY "Game creators can manage their games"
  ON public.live_games
  FOR ALL
  USING (auth.uid() = creator_id);

CREATE POLICY "Anyone can view active games by PIN"
  ON public.live_games
  FOR SELECT
  USING (status IN ('waiting', 'in_progress'));

CREATE POLICY "Institution members can view institution games"
  ON public.live_games
  FOR SELECT
  USING (
    institution_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM institution_members
      WHERE institution_members.institution_id = live_games.institution_id
      AND institution_members.user_id = auth.uid()
      AND institution_members.status = 'active'
    )
  );

-- RLS Policies for live_game_players
CREATE POLICY "Players can view other players in their game"
  ON public.live_game_players
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM live_games
      WHERE live_games.id = game_id
    )
  );

CREATE POLICY "Users can join games as players"
  ON public.live_game_players
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Game creators can view all players"
  ON public.live_game_players
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM live_games
      WHERE live_games.id = game_id
      AND live_games.creator_id = auth.uid()
    )
  );

-- RLS Policies for live_game_questions
CREATE POLICY "Questions are viewable by game participants"
  ON public.live_game_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM live_games
      WHERE live_games.id = game_id
      AND (
        live_games.creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM live_game_players
          WHERE live_game_players.game_id = live_games.id
          AND live_game_players.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Game creators can manage questions"
  ON public.live_game_questions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM live_games
      WHERE live_games.id = game_id
      AND live_games.creator_id = auth.uid()
    )
  );

-- RLS Policies for live_game_answers
CREATE POLICY "Players can submit their own answers"
  ON public.live_game_answers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM live_game_players
      WHERE live_game_players.id = player_id
      AND live_game_players.user_id = auth.uid()
    )
  );

CREATE POLICY "Players can view their own answers"
  ON public.live_game_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM live_game_players
      WHERE live_game_players.id = player_id
      AND live_game_players.user_id = auth.uid()
    )
  );

CREATE POLICY "Game creators can view all answers"
  ON public.live_game_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM live_game_players lgp
      JOIN live_games lg ON lg.id = lgp.game_id
      WHERE lgp.id = player_id
      AND lg.creator_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_live_games_pin ON live_games(pin);
CREATE INDEX idx_live_games_status ON live_games(status);
CREATE INDEX idx_live_games_creator ON live_games(creator_id);
CREATE INDEX idx_live_game_players_game ON live_game_players(game_id);
CREATE INDEX idx_live_game_questions_game ON live_game_questions(game_id);
CREATE INDEX idx_live_game_answers_player ON live_game_answers(player_id);

-- Enable realtime for live game tables
ALTER PUBLICATION supabase_realtime ADD TABLE live_games;
ALTER PUBLICATION supabase_realtime ADD TABLE live_game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE live_game_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE live_game_answers;

-- Function to generate unique PIN
CREATE OR REPLACE FUNCTION generate_game_pin()
RETURNS TEXT AS $$
DECLARE
  new_pin TEXT;
  pin_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-digit PIN
    new_pin := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if PIN already exists in active games
    SELECT EXISTS(
      SELECT 1 FROM live_games 
      WHERE pin = new_pin 
      AND status IN ('waiting', 'in_progress')
    ) INTO pin_exists;
    
    EXIT WHEN NOT pin_exists;
  END LOOP;
  
  RETURN new_pin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;