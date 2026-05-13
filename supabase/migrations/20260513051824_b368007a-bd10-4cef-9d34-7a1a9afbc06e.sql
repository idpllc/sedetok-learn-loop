
CREATE TABLE public.notebook_trivia_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_key text NOT NULL UNIQUE,
  title text NOT NULL,
  subject text,
  description text,
  source_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ntt_topic_key ON public.notebook_trivia_topics(topic_key);
ALTER TABLE public.notebook_trivia_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read topics" ON public.notebook_trivia_topics FOR SELECT TO authenticated USING (true);

CREATE TABLE public.notebook_trivia_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_key text NOT NULL REFERENCES public.notebook_trivia_topics(topic_key) ON DELETE CASCADE,
  position int NOT NULL CHECK (position BETWEEN 1 AND 30),
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_index int NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (topic_key, position)
);
CREATE INDEX idx_ntq_topic ON public.notebook_trivia_questions(topic_key, position);
ALTER TABLE public.notebook_trivia_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read questions" ON public.notebook_trivia_questions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.notebook_trivia_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_key text NOT NULL REFERENCES public.notebook_trivia_topics(topic_key) ON DELETE CASCADE,
  notebook_id uuid,
  host_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','in_progress','finished')),
  current_question int NOT NULL DEFAULT 0,
  question_started_at timestamptz,
  max_players int NOT NULL DEFAULT 30,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ntr_topic_status ON public.notebook_trivia_rooms(topic_key, status);
CREATE INDEX idx_ntr_status_created ON public.notebook_trivia_rooms(status, created_at DESC);
ALTER TABLE public.notebook_trivia_rooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notebook_trivia_room_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.notebook_trivia_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text,
  avatar_url text,
  score int NOT NULL DEFAULT 0,
  correct_count int NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
CREATE INDEX idx_ntrp_room ON public.notebook_trivia_room_players(room_id);
CREATE INDEX idx_ntrp_user ON public.notebook_trivia_room_players(user_id);
ALTER TABLE public.notebook_trivia_room_players ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_user_in_trivia_room(_user_id uuid, _room_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.notebook_trivia_room_players WHERE room_id = _room_id AND user_id = _user_id);
$$;

CREATE POLICY "view rooms waiting or mine" ON public.notebook_trivia_rooms FOR SELECT TO authenticated
USING (status = 'waiting' OR host_user_id = auth.uid() OR public.is_user_in_trivia_room(auth.uid(), id));

CREATE POLICY "create own room" ON public.notebook_trivia_rooms FOR INSERT TO authenticated
WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "host updates room" ON public.notebook_trivia_rooms FOR UPDATE TO authenticated
USING (host_user_id = auth.uid()) WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "view players visible rooms" ON public.notebook_trivia_room_players FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_user_in_trivia_room(auth.uid(), room_id)
  OR EXISTS (SELECT 1 FROM public.notebook_trivia_rooms r WHERE r.id = room_id AND r.status = 'waiting')
);

CREATE POLICY "join self waiting room" ON public.notebook_trivia_room_players FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.notebook_trivia_rooms r
    WHERE r.id = room_id AND r.status = 'waiting'
      AND (SELECT COUNT(*) FROM public.notebook_trivia_room_players p WHERE p.room_id = r.id) < r.max_players
  )
);

CREATE POLICY "update own player" ON public.notebook_trivia_room_players FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE TABLE public.notebook_trivia_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.notebook_trivia_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  question_position int NOT NULL,
  selected_index int,
  is_correct boolean NOT NULL DEFAULT false,
  time_ms int,
  points int NOT NULL DEFAULT 0,
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id, question_position)
);
CREATE INDEX idx_nta_room ON public.notebook_trivia_answers(room_id);
ALTER TABLE public.notebook_trivia_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view answers my rooms" ON public.notebook_trivia_answers FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_user_in_trivia_room(auth.uid(), room_id));

CREATE POLICY "insert own answers" ON public.notebook_trivia_answers FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_user_in_trivia_room(auth.uid(), room_id));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notebook_trivia_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notebook_trivia_room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notebook_trivia_answers;
ALTER TABLE public.notebook_trivia_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.notebook_trivia_room_players REPLICA IDENTITY FULL;
ALTER TABLE public.notebook_trivia_answers REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.award_notebook_trivia_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_player record;
  v_top_score int;
  v_xp int;
BEGIN
  IF NEW.status = 'finished' AND (OLD.status IS DISTINCT FROM 'finished') THEN
    SELECT MAX(score) INTO v_top_score FROM public.notebook_trivia_room_players WHERE room_id = NEW.id;
    FOR v_player IN
      SELECT user_id, score, correct_count FROM public.notebook_trivia_room_players WHERE room_id = NEW.id
    LOOP
      v_xp := CASE
        WHEN v_top_score IS NOT NULL AND v_player.score = v_top_score AND v_player.score > 0 THEN 100
        WHEN v_player.correct_count >= 5 THEN 50
        ELSE 20
      END;
      INSERT INTO public.user_xp_log (user_id, action_type, xp_amount)
      VALUES (
        v_player.user_id,
        CASE WHEN v_top_score IS NOT NULL AND v_player.score = v_top_score AND v_player.score > 0
             THEN 'notebook_trivia_win' ELSE 'notebook_trivia_play' END,
        v_xp
      );
      UPDATE public.profiles SET experience_points = COALESCE(experience_points, 0) + v_xp WHERE id = v_player.user_id;
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_award_notebook_trivia_xp
AFTER UPDATE ON public.notebook_trivia_rooms
FOR EACH ROW EXECUTE FUNCTION public.award_notebook_trivia_xp();
