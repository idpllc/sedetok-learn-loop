
-- 1. TABLES (no FK to tables not yet created)
CREATE TABLE public.academic_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  course_name text,
  director_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  academic_year text DEFAULT '2025',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.academic_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.academic_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'student',
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name text,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  academic_group_id uuid REFERENCES public.academic_groups(id) ON DELETE SET NULL,
  avatar_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  muted boolean DEFAULT false,
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  file_url text,
  file_name text,
  reply_to_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2. ENABLE RLS
ALTER TABLE public.academic_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES
-- academic_groups
CREATE POLICY "Institution members can view their groups"
ON public.academic_groups FOR SELECT
USING (EXISTS (SELECT 1 FROM institution_members WHERE institution_members.institution_id = academic_groups.institution_id AND institution_members.user_id = auth.uid() AND institution_members.status = 'active'));

CREATE POLICY "Admins can manage groups"
ON public.academic_groups FOR ALL
USING (is_institution_admin(auth.uid(), institution_id))
WITH CHECK (is_institution_admin(auth.uid(), institution_id));

-- academic_group_members
CREATE POLICY "Institution members can view group members"
ON public.academic_group_members FOR SELECT
USING (EXISTS (SELECT 1 FROM academic_groups ag JOIN institution_members im ON im.institution_id = ag.institution_id WHERE ag.id = academic_group_members.group_id AND im.user_id = auth.uid() AND im.status = 'active'));

CREATE POLICY "Admins can manage group members"
ON public.academic_group_members FOR ALL
USING (EXISTS (SELECT 1 FROM academic_groups ag WHERE ag.id = academic_group_members.group_id AND is_institution_admin(auth.uid(), ag.institution_id)))
WITH CHECK (EXISTS (SELECT 1 FROM academic_groups ag WHERE ag.id = academic_group_members.group_id AND is_institution_admin(auth.uid(), ag.institution_id)));

-- chat_conversations
CREATE POLICY "Participants can view conversations"
ON public.chat_conversations FOR SELECT
USING (EXISTS (SELECT 1 FROM chat_participants WHERE chat_participants.conversation_id = chat_conversations.id AND chat_participants.user_id = auth.uid()));

CREATE POLICY "Users can create conversations"
ON public.chat_conversations FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can view institution conversations"
ON public.chat_conversations FOR SELECT
USING (institution_id IS NOT NULL AND EXISTS (SELECT 1 FROM institution_members WHERE institution_members.institution_id = chat_conversations.institution_id AND institution_members.user_id = auth.uid() AND institution_members.member_role = 'admin' AND institution_members.status = 'active'));

-- chat_participants
CREATE POLICY "Users can view participants of their conversations"
ON public.chat_participants FOR SELECT
USING (EXISTS (SELECT 1 FROM chat_participants cp WHERE cp.conversation_id = chat_participants.conversation_id AND cp.user_id = auth.uid()));

CREATE POLICY "Users can add participants"
ON public.chat_participants FOR INSERT
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM chat_conversations WHERE chat_conversations.id = chat_participants.conversation_id AND chat_conversations.created_by = auth.uid()));

CREATE POLICY "Users can update own participation"
ON public.chat_participants FOR UPDATE
USING (auth.uid() = user_id);

-- chat_messages
CREATE POLICY "Participants can view messages"
ON public.chat_messages FOR SELECT
USING (
  EXISTS (SELECT 1 FROM chat_participants WHERE chat_participants.conversation_id = chat_messages.conversation_id AND chat_participants.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM chat_conversations cc JOIN institution_members im ON im.institution_id = cc.institution_id WHERE cc.id = chat_messages.conversation_id AND im.user_id = auth.uid() AND im.member_role = 'admin' AND im.status = 'active')
);

CREATE POLICY "Participants can send messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM chat_participants WHERE chat_participants.conversation_id = chat_messages.conversation_id AND chat_participants.user_id = auth.uid()));

CREATE POLICY "Users can edit own messages"
ON public.chat_messages FOR UPDATE
USING (auth.uid() = sender_id);

-- 4. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;

-- 5. INDEXES
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at DESC);
CREATE INDEX idx_chat_participants_user ON public.chat_participants(user_id);
CREATE INDEX idx_chat_participants_conversation ON public.chat_participants(conversation_id);
CREATE INDEX idx_academic_group_members_group ON public.academic_group_members(group_id);
CREATE INDEX idx_academic_group_members_user ON public.academic_group_members(user_id);

-- 6. STORAGE
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', true);

CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view chat files"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-files');

-- 7. TRIGGERS
CREATE OR REPLACE FUNCTION public.create_group_chat_for_director()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE conv_id uuid; member_record record; group_name text;
BEGIN
  IF NEW.director_user_id IS NULL THEN RETURN NEW; END IF;
  group_name := COALESCE(NEW.name, 'Grupo') || ' - ' || COALESCE(NEW.course_name, NEW.academic_year);
  INSERT INTO chat_conversations (type, name, institution_id, academic_group_id, created_by)
  VALUES ('group', group_name, NEW.institution_id, NEW.id, NEW.director_user_id) RETURNING id INTO conv_id;
  INSERT INTO chat_participants (conversation_id, user_id, role) VALUES (conv_id, NEW.director_user_id, 'admin');
  FOR member_record IN SELECT user_id FROM academic_group_members WHERE group_id = NEW.id LOOP
    INSERT INTO chat_participants (conversation_id, user_id, role) VALUES (conv_id, member_record.user_id, 'member') ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_create_group_chat_on_director
AFTER INSERT OR UPDATE OF director_user_id ON public.academic_groups
FOR EACH ROW EXECUTE FUNCTION public.create_group_chat_for_director();

CREATE OR REPLACE FUNCTION public.add_member_to_group_chat()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE conv_id uuid;
BEGIN
  SELECT id INTO conv_id FROM chat_conversations WHERE academic_group_id = NEW.group_id AND type = 'group' LIMIT 1;
  IF conv_id IS NOT NULL THEN
    INSERT INTO chat_participants (conversation_id, user_id, role) VALUES (conv_id, NEW.user_id, 'member') ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_add_member_to_group_chat
AFTER INSERT ON public.academic_group_members
FOR EACH ROW EXECUTE FUNCTION public.add_member_to_group_chat();
