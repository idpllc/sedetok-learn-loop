-- Add foreign key from trivia_1v1_players to profiles
ALTER TABLE trivia_1v1_players 
ADD CONSTRAINT trivia_1v1_players_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;