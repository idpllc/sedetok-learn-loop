-- Create table for storing vocational profiles
CREATE TABLE IF NOT EXISTS public.vocational_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendations JSONB NOT NULL,
  summary TEXT NOT NULL,
  confidence JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.vocational_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own vocational profile
CREATE POLICY "Users can view their own vocational profile"
ON public.vocational_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own vocational profile
CREATE POLICY "Users can insert their own vocational profile"
ON public.vocational_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own vocational profile
CREATE POLICY "Users can update their own vocational profile"
ON public.vocational_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own vocational profile
CREATE POLICY "Users can delete their own vocational profile"
ON public.vocational_profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_vocational_profiles_updated_at
  BEFORE UPDATE ON public.vocational_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();