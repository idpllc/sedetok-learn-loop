-- 1) Tighten live_game_answers SELECT policy: drop the overly broad existing one
--    and replace with strict per-player visibility.
DROP POLICY IF EXISTS "Players can view answers in their game" ON public.live_game_answers;

CREATE POLICY "Players can view their own answers"
ON public.live_game_answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.live_game_players p
    WHERE p.id = live_game_answers.player_id
      AND p.user_id IS NOT NULL
      AND p.user_id = auth.uid()
  )
);
-- Note: existing policy "Game creators can view all answers" already covers hosts.

-- 2) Lock down chat-files storage bucket
--    Make bucket private, restrict SELECT to conversation participants,
--    and add owner-scoped UPDATE/DELETE.
UPDATE storage.buckets SET public = false WHERE id = 'chat-files';

DROP POLICY IF EXISTS "Anyone can view chat files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat files" ON storage.objects;
DROP POLICY IF EXISTS "Conversation participants can view chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload chat files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update chat files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete chat files" ON storage.objects;

-- Files are stored under a path that begins with the conversation id, e.g.
-- "{conversation_id}/{user_id}/filename" — so we use the first folder segment
-- as the conversation id. SELECT is restricted to participants.
CREATE POLICY "Conversation participants can view chat files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-files'
  AND EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.user_id = auth.uid()
      AND cp.conversation_id::text = (storage.foldername(name))[1]
  )
);

-- Uploads: must be authenticated AND a participant of the target conversation
CREATE POLICY "Participants can upload chat files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-files'
  AND auth.uid() = owner
  AND EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.user_id = auth.uid()
      AND cp.conversation_id::text = (storage.foldername(name))[1]
  )
);

-- Owners can update/delete their own files
CREATE POLICY "Owners can update chat files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-files' AND owner = auth.uid())
WITH CHECK (bucket_id = 'chat-files' AND owner = auth.uid());

CREATE POLICY "Owners can delete chat files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chat-files' AND owner = auth.uid());

-- 3) Set search_path on functions currently missing it (linter warning)
ALTER FUNCTION public.decrement_likes_count() SET search_path = public;
ALTER FUNCTION public.update_ai_chat_conversations_updated_at() SET search_path = public;
ALTER FUNCTION public.increment_saves_count() SET search_path = public;
ALTER FUNCTION public.get_evaluation_event_by_code(text) SET search_path = public;
ALTER FUNCTION public.decrement_comments_count() SET search_path = public;
ALTER FUNCTION public.update_trivia_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.create_default_notification_preferences() SET search_path = public;
ALTER FUNCTION public.increment_shares_count(uuid) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.increment_likes_count() SET search_path = public;
ALTER FUNCTION public.increment_shares_count(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.update_followers_count() SET search_path = public;
ALTER FUNCTION public.decrement_saves_count() SET search_path = public;
ALTER FUNCTION public.increment_comments_count() SET search_path = public;
ALTER FUNCTION public.generate_access_code() SET search_path = public;
ALTER FUNCTION public.generate_game_pin() SET search_path = public;
ALTER FUNCTION public.increment_shares_count(uuid, uuid, uuid) SET search_path = public;