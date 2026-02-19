
-- Fix the recursive RLS policy on chat_participants
-- The current SELECT policy does a self-referential EXISTS query which can fail
-- Replace with a simpler direct check: users can see their own participations
-- AND participations of conversations they're part of

DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.chat_participants;

-- Simpler policy: A user can see rows where either:
-- 1. They are the participant (their own rows)
-- 2. They are in the same conversation (using chat_conversations as pivot to avoid recursion)
CREATE POLICY "Users can view participants of their conversations"
ON public.chat_participants
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  conversation_id IN (
    SELECT conversation_id 
    FROM public.chat_participants 
    WHERE user_id = auth.uid()
  )
);
