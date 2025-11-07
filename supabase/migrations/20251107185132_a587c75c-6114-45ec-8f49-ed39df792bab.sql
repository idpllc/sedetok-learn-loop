-- Tabla para invitaciones de trivia 1v1
CREATE TABLE IF NOT EXISTS public.trivia_1v1_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'libre',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, expired
  match_id UUID REFERENCES public.trivia_1v1_matches(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_pending_invitation UNIQUE (sender_id, receiver_id, status)
);

-- Enable RLS
ALTER TABLE public.trivia_1v1_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for invitations
CREATE POLICY "Users can view invitations they sent"
  ON public.trivia_1v1_invitations
  FOR SELECT
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can view invitations they received"
  ON public.trivia_1v1_invitations
  FOR SELECT
  USING (auth.uid() = receiver_id);

CREATE POLICY "Users can send invitations"
  ON public.trivia_1v1_invitations
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update invitations they received"
  ON public.trivia_1v1_invitations
  FOR UPDATE
  USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete invitations they sent"
  ON public.trivia_1v1_invitations
  FOR DELETE
  USING (auth.uid() = sender_id);

-- Index for faster queries
CREATE INDEX idx_trivia_invitations_receiver ON public.trivia_1v1_invitations(receiver_id, status);
CREATE INDEX idx_trivia_invitations_sender ON public.trivia_1v1_invitations(sender_id, status);

-- Enable realtime
ALTER TABLE public.trivia_1v1_invitations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trivia_1v1_invitations;