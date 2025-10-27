-- Add awards field to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS awards jsonb DEFAULT '[]'::jsonb;