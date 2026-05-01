-- Content fields used by notebook capsules
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS reading_type TEXT;

ALTER TABLE public.content
  DROP CONSTRAINT IF EXISTS content_reading_type_check;

ALTER TABLE public.content
  ADD CONSTRAINT content_reading_type_check
  CHECK (reading_type IS NULL OR reading_type IN ('libro','resumen','ensayo','notas','glosario','otro'));

UPDATE public.content
  SET reading_type = 'resumen'
  WHERE content_type = 'lectura' AND reading_type IS NULL;

ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS mind_map_data JSONB;

-- Add mind map enum value only if the enum exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'content_type') THEN
    ALTER TYPE public.content_type ADD VALUE IF NOT EXISTS 'mapa_mental';
  END IF;
END $$;

-- Notebooks table
CREATE TABLE IF NOT EXISTS public.notebooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Cuaderno sin título',
  description TEXT,
  cover_emoji TEXT DEFAULT '📓',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notebooks_user ON public.notebooks(user_id, updated_at DESC);

ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notebooks" ON public.notebooks;
DROP POLICY IF EXISTS "Users insert own notebooks" ON public.notebooks;
DROP POLICY IF EXISTS "Users update own notebooks" ON public.notebooks;
DROP POLICY IF EXISTS "Users delete own notebooks" ON public.notebooks;

CREATE POLICY "Users view own notebooks" ON public.notebooks
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own notebooks" ON public.notebooks
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own notebooks" ON public.notebooks
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own notebooks" ON public.notebooks
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_notebooks_updated_at ON public.notebooks;
CREATE TRIGGER update_notebooks_updated_at
BEFORE UPDATE ON public.notebooks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notebook sources table
CREATE TABLE IF NOT EXISTS public.notebook_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_notebook_sources_notebook ON public.notebook_sources(notebook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notebook_sources_user ON public.notebook_sources(user_id, created_at DESC);

ALTER TABLE public.notebook_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own sources" ON public.notebook_sources;
DROP POLICY IF EXISTS "Users insert own sources" ON public.notebook_sources;
DROP POLICY IF EXISTS "Users update own sources" ON public.notebook_sources;
DROP POLICY IF EXISTS "Users delete own sources" ON public.notebook_sources;

CREATE POLICY "Users view own sources" ON public.notebook_sources
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own sources" ON public.notebook_sources
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.notebooks n
    WHERE n.id = notebook_id AND n.user_id = auth.uid()
  )
);

CREATE POLICY "Users update own sources" ON public.notebook_sources
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own sources" ON public.notebook_sources
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_notebook_sources_updated_at ON public.notebook_sources;
CREATE TRIGGER update_notebook_sources_updated_at
BEFORE UPDATE ON public.notebook_sources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link existing chat conversations to notebooks and individual sources
ALTER TABLE public.ai_chat_conversations
  ADD COLUMN IF NOT EXISTS notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE;

ALTER TABLE public.ai_chat_conversations
  ADD COLUMN IF NOT EXISTS notebook_source_id UUID REFERENCES public.notebook_sources(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_notebook ON public.ai_chat_conversations(notebook_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_notebook_source
  ON public.ai_chat_conversations (user_id, notebook_id, notebook_source_id);