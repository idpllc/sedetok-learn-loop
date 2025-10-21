-- Create institutions table
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create institution_members table
CREATE TABLE IF NOT EXISTS public.institution_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL CHECK (member_role IN ('student', 'teacher', 'parent')),
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(institution_id, user_id)
);

-- Enable RLS
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for institutions
CREATE POLICY "Institutions are viewable by admins and members"
ON public.institutions FOR SELECT
USING (
  auth.uid() = admin_user_id 
  OR EXISTS (
    SELECT 1 FROM public.institution_members 
    WHERE institution_id = institutions.id 
    AND user_id = auth.uid()
    AND status = 'active'
  )
);

CREATE POLICY "Admins can create institutions"
ON public.institutions FOR INSERT
WITH CHECK (auth.uid() = admin_user_id);

CREATE POLICY "Admins can update their institutions"
ON public.institutions FOR UPDATE
USING (auth.uid() = admin_user_id)
WITH CHECK (auth.uid() = admin_user_id);

CREATE POLICY "Admins can delete their institutions"
ON public.institutions FOR DELETE
USING (auth.uid() = admin_user_id);

-- RLS Policies for institution_members
CREATE POLICY "Institution members are viewable by institution admin and members"
ON public.institution_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.institutions 
    WHERE id = institution_members.institution_id 
    AND admin_user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Institution admins can add members"
ON public.institution_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.institutions 
    WHERE id = institution_members.institution_id 
    AND admin_user_id = auth.uid()
  )
);

CREATE POLICY "Institution admins can update members"
ON public.institution_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.institutions 
    WHERE id = institution_members.institution_id 
    AND admin_user_id = auth.uid()
  )
);

CREATE POLICY "Institution admins can delete members"
ON public.institution_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.institutions 
    WHERE id = institution_members.institution_id 
    AND admin_user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_institutions_admin ON public.institutions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_institution_members_institution ON public.institution_members(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_members_user ON public.institution_members(user_id);

-- Add updated_at trigger for institutions
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER institutions_updated_at
  BEFORE UPDATE ON public.institutions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();