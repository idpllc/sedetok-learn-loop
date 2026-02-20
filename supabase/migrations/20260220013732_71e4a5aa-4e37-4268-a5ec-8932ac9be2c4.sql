
-- Fix 1: Replace recursive chat_participants SELECT policy with a direct, non-recursive one
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.chat_participants;

CREATE POLICY "Users can view participants of their conversations"
ON public.chat_participants
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Fix 2: Add policy so users can also see OTHER participants in their conversations (needed for group display)
CREATE POLICY "Users can view co-participants"
ON public.chat_participants
FOR SELECT
USING (
  conversation_id IN (
    SELECT cp.conversation_id 
    FROM public.chat_participants cp 
    WHERE cp.user_id = auth.uid()
  )
);

-- Fix 3: Add UPDATE/DELETE policy for chat_conversations so participants can update timestamps
DROP POLICY IF EXISTS "Participants can update their conversations" ON public.chat_conversations;

CREATE POLICY "Participants can update their conversations"
ON public.chat_conversations
FOR UPDATE
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.conversation_id = chat_conversations.id 
    AND cp.user_id = auth.uid()
    AND cp.role = 'admin'
  )
);
