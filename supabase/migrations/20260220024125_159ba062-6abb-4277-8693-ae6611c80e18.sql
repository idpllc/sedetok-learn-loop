-- ============================================================
-- Fix 1: Remove orphan profile record blocking user creation
-- ============================================================
DELETE FROM public.profiles WHERE id = 'dcce647b-982d-4dde-915d-5ac18450f565';

-- ============================================================
-- Fix 2: Fix handle_new_user trigger to use ON CONFLICT DO NOTHING
-- on profiles insert (prevents "duplicate username" crash)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_username TEXT;
  v_counter INT := 0;
BEGIN
  -- Build base username from email prefix
  v_username := regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g');

  -- Ensure uniqueness by appending counter if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
    v_counter := v_counter + 1;
    v_username := regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g') || '_' || v_counter;
  END LOOP;

  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    new.id,
    v_username,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user')
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$;

-- ============================================================
-- Fix 3: Replace recursive RLS on chat_participants with a
-- non-recursive approach using a SECURITY DEFINER function
-- ============================================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view co-participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.chat_participants;

-- Create a non-recursive helper function
CREATE OR REPLACE FUNCTION public.get_my_conversation_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT conversation_id FROM public.chat_participants WHERE user_id = auth.uid();
$$;

-- Single non-recursive SELECT policy
CREATE POLICY "Users can view chat participants"
ON public.chat_participants
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  conversation_id IN (SELECT public.get_my_conversation_ids())
);