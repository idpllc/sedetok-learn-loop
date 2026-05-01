
-- Notebooks table
CREATE TABLE public.notebooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Cuaderno sin título',
  description TEXT,
  cover_emoji TEXT DEFAULT '📓',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notebooks_user ON public.notebooks(user_id, updated_at DESC);

ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notebooks" ON public.notebooks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notebooks" ON public.notebooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notebooks" ON public.notebooks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notebooks" ON public.notebooks FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_notebooks_updated_at
BEFORE UPDATE ON public.notebooks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notebook sources table
CREATE TABLE public.notebook_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('text','pdf','docx','xlsx','video','url','competence')),
  title TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  extracted_text TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('processing','ready','error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notebook_sources_notebook ON public.notebook_sources(notebook_id, created_at DESC);

ALTER TABLE public.notebook_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sources" ON public.notebook_sources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sources" ON public.notebook_sources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sources" ON public.notebook_sources FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sources" ON public.notebook_sources FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_notebook_sources_updated_at
BEFORE UPDATE ON public.notebook_sources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link existing chat conversations to notebooks
ALTER TABLE public.ai_chat_conversations
  ADD COLUMN IF NOT EXISTS notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_notebook ON public.ai_chat_conversations(notebook_id);
