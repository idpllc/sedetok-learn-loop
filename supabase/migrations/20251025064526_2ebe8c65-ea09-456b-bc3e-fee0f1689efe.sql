-- Add foreign key constraint for games.creator_id
ALTER TABLE public.games 
ADD CONSTRAINT games_creator_id_fkey 
FOREIGN KEY (creator_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;