-- Allow users to insert their own XP log entries
CREATE POLICY "Users can insert their own XP log entries"
ON user_xp_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);