-- Drop the incorrectly named tables
DROP TABLE IF EXISTS trivia_match_turns CASCADE;
DROP TABLE IF EXISTS trivia_match_players CASCADE;
DROP TABLE IF EXISTS trivia_matches CASCADE;

-- Create trivia 1v1 matches table
CREATE TABLE trivia_1v1_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  current_player_id UUID,
  current_category_id UUID REFERENCES trivia_categories(id),
  current_question_number INTEGER DEFAULT 0,
  winner_id UUID,
  level TEXT NOT NULL DEFAULT 'libre' CHECK (level IN ('primaria', 'secundaria', 'universidad', 'libre')),
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create trivia 1v1 players table
CREATE TABLE trivia_1v1_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES trivia_1v1_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  player_number INTEGER NOT NULL CHECK (player_number IN (1, 2)),
  characters_collected JSONB DEFAULT '[]'::jsonb,
  current_streak INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, user_id),
  UNIQUE(match_id, player_number)
);

-- Create trivia 1v1 turns table
CREATE TABLE trivia_1v1_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES trivia_1v1_matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES trivia_categories(id),
  question_id UUID NOT NULL REFERENCES trivia_questions(id),
  answer_correct BOOLEAN NOT NULL,
  time_taken INTEGER,
  streak_at_answer INTEGER DEFAULT 0,
  character_won UUID REFERENCES trivia_categories(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE trivia_1v1_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivia_1v1_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivia_1v1_turns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trivia_1v1_matches
CREATE POLICY "Users can view matches they're in"
  ON trivia_1v1_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trivia_1v1_players
      WHERE trivia_1v1_players.match_id = trivia_1v1_matches.id
        AND trivia_1v1_players.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create matches"
  ON trivia_1v1_matches FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Players in match can update it"
  ON trivia_1v1_matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trivia_1v1_players
      WHERE trivia_1v1_players.match_id = trivia_1v1_matches.id
        AND trivia_1v1_players.user_id = auth.uid()
    )
  );

-- RLS Policies for trivia_1v1_players
CREATE POLICY "Users can view match players"
  ON trivia_1v1_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trivia_1v1_players mp
      WHERE mp.match_id = trivia_1v1_players.match_id
        AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join matches"
  ON trivia_1v1_players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Players can update their own data"
  ON trivia_1v1_players FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for trivia_1v1_turns
CREATE POLICY "Users can view turns from their matches"
  ON trivia_1v1_turns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trivia_1v1_players
      WHERE trivia_1v1_players.match_id = trivia_1v1_turns.match_id
        AND trivia_1v1_players.user_id = auth.uid()
    )
  );

CREATE POLICY "Players can insert their own turns"
  ON trivia_1v1_turns FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- Create indexes
CREATE INDEX idx_trivia_1v1_matches_code ON trivia_1v1_matches(match_code);
CREATE INDEX idx_trivia_1v1_matches_status ON trivia_1v1_matches(status);
CREATE INDEX idx_trivia_1v1_players_match ON trivia_1v1_players(match_id);
CREATE INDEX idx_trivia_1v1_players_user ON trivia_1v1_players(user_id);
CREATE INDEX idx_trivia_1v1_turns_match ON trivia_1v1_turns(match_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE trivia_1v1_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE trivia_1v1_players;
ALTER PUBLICATION supabase_realtime ADD TABLE trivia_1v1_turns;