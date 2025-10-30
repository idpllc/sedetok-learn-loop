-- Fix SELECT policy to allow viewing active matches
DROP POLICY IF EXISTS "Users can view matches" ON public.trivia_1v1_matches;

CREATE POLICY "Users can view matches"
ON public.trivia_1v1_matches
FOR SELECT
TO authenticated
USING (
  is_user_in_trivia_match(auth.uid(), id) 
  OR status IN ('waiting', 'active')
);