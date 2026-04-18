-- trivia_1v1_matches: tighten INSERT to require current_player_id = auth.uid()
DROP POLICY IF EXISTS "Authenticated users can create matches" ON public.trivia_1v1_matches;
CREATE POLICY "Authenticated users can create matches"
ON public.trivia_1v1_matches
FOR INSERT
TO authenticated
WITH CHECK (current_player_id = auth.uid());

-- notifications: remove client-side INSERT entirely. Backend (service_role) bypasses RLS.
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

-- user_subject_results: drop the open service-role insert policy.
-- service_role bypasses RLS and does not need a policy at all.
DROP POLICY IF EXISTS "Service role can insert subject results" ON public.user_subject_results;

-- student_study_plans: drop the open service-role manage-all policy.
DROP POLICY IF EXISTS "Service role manages study plans" ON public.student_study_plans;