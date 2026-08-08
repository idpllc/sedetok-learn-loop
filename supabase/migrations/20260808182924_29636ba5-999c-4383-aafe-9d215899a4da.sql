
-- Chat: break chat_conversations <-> chat_participants cycle
CREATE OR REPLACE FUNCTION public.get_my_admin_conversation_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT conversation_id FROM public.chat_participants
  WHERE user_id = auth.uid() AND role = 'admin';
$$;

REVOKE ALL ON FUNCTION public.get_my_admin_conversation_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_admin_conversation_ids() TO authenticated, service_role;

DROP POLICY IF EXISTS "Participants can view conversations" ON public.chat_conversations;
CREATE POLICY "Participants can view conversations"
ON public.chat_conversations FOR SELECT
USING (id IN (SELECT public.get_my_conversation_ids()));

DROP POLICY IF EXISTS "Participants can update their conversations" ON public.chat_conversations;
CREATE POLICY "Participants can update their conversations"
ON public.chat_conversations FOR UPDATE
USING (auth.uid() = created_by OR id IN (SELECT public.get_my_admin_conversation_ids()));

-- Learning paths: break learning_paths <-> learning_path_institutions cycle
CREATE OR REPLACE FUNCTION public.is_path_creator(_path_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.learning_paths lp WHERE lp.id = _path_id AND lp.creator_id = _user_id);
$$;

REVOKE ALL ON FUNCTION public.is_path_creator(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_path_creator(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Path creators can link institutions" ON public.learning_path_institutions;
CREATE POLICY "Path creators can link institutions"
ON public.learning_path_institutions FOR INSERT
WITH CHECK (public.is_path_creator(path_id, auth.uid()));

DROP POLICY IF EXISTS "Path creators can unlink institutions" ON public.learning_path_institutions;
CREATE POLICY "Path creators can unlink institutions"
ON public.learning_path_institutions FOR DELETE
USING (public.is_path_creator(path_id, auth.uid()));
