
-- CEFR level enum
CREATE TYPE public.cefr_level AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- Language skill categories
CREATE TYPE public.language_skill AS ENUM ('grammar', 'vocabulary', 'listening', 'speaking', 'reading', 'writing');

-- Main table: user's current English level assessment
CREATE TABLE public.language_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_level cefr_level,
  previous_level cefr_level,
  assessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assessment_method TEXT DEFAULT 'tutor_conversation',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Assessment sessions: each evaluation conversation
CREATE TABLE public.language_assessment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.ai_chat_conversations(id) ON DELETE SET NULL,
  determined_level cefr_level,
  session_type TEXT NOT NULL DEFAULT 'evaluation',
  status TEXT NOT NULL DEFAULT 'in_progress',
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  recommendations TEXT,
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Skill-level breakdown per assessment
CREATE TABLE public.language_skill_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.language_assessment_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill language_skill NOT NULL,
  level cefr_level,
  score NUMERIC(5,2) DEFAULT 0,
  max_score NUMERIC(5,2) DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.language_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.language_assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.language_skill_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for language_assessments
CREATE POLICY "Users can view own assessment" ON public.language_assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assessment" ON public.language_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assessment" ON public.language_assessments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Institution staff can view student assessments" ON public.language_assessments FOR SELECT USING (can_view_student_data(auth.uid(), user_id));

-- RLS Policies for language_assessment_sessions
CREATE POLICY "Users can view own sessions" ON public.language_assessment_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.language_assessment_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.language_assessment_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Institution staff can view student sessions" ON public.language_assessment_sessions FOR SELECT USING (can_view_student_data(auth.uid(), user_id));

-- RLS Policies for language_skill_scores
CREATE POLICY "Users can view own skill scores" ON public.language_skill_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own skill scores" ON public.language_skill_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Institution staff can view student skill scores" ON public.language_skill_scores FOR SELECT USING (can_view_student_data(auth.uid(), user_id));

-- Updated_at trigger for language_assessments
CREATE TRIGGER update_language_assessments_updated_at
  BEFORE UPDATE ON public.language_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
