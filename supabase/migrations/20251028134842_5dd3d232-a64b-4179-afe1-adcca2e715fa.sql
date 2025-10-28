-- Ensure user_id has unique constraint for upsert to work
ALTER TABLE vocational_profiles 
DROP CONSTRAINT IF EXISTS vocational_profiles_user_id_key;

ALTER TABLE vocational_profiles 
ADD CONSTRAINT vocational_profiles_user_id_key UNIQUE (user_id);