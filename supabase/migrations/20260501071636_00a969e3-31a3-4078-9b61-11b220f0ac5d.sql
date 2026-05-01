
-- Restore EXECUTE on helper functions used inside RLS policies.
-- PostgREST evaluates RLS as the caller role (anon/authenticated), so the caller
-- must have EXECUTE on functions referenced by USING/WITH CHECK clauses, even if
-- the function is SECURITY DEFINER.

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_institution_admin(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_institution_staff(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_institution_member(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_institution_member_of_student(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_in_trivia_match(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_student_data(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_course(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_conversation_ids() TO anon, authenticated;

-- Counter / XP functions are called via supabase.rpc from the client, restore those too.
GRANT EXECUTE ON FUNCTION public.increment_views_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_likes_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_likes_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_saves_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_saves_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_comments_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_comments_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_shares_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp_for_action(uuid, uuid, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp_for_upload(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp_for_quiz_creation(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp_for_path_creation(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_award_path_completion_xp(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_institution_xp_per_capita(uuid) TO anon, authenticated;
