-- Fix RLS policies for trivia_1v1_matches to allow proper insertions
-- Drop existing INSERT policy and create a simpler one
DROP POLICY IF EXISTS "Users can create matches" ON public.trivia_1v1_matches;

-- Create a simple policy that allows authenticated users to insert matches
CREATE POLICY "Authenticated users can create matches"
ON public.trivia_1v1_matches
FOR INSERT
TO authenticated
WITH CHECK (true);