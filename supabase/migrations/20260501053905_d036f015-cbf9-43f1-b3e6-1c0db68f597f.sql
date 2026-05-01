ALTER TABLE public.ai_chat_conversations
  ADD COLUMN IF NOT EXISTS notebook_source_id uuid REFERENCES public.notebook_sources(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_notebook_source
  ON public.ai_chat_conversations (user_id, notebook_id, notebook_source_id);