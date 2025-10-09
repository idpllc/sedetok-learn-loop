-- Add quiz_id column to likes table
ALTER TABLE public.likes
ADD COLUMN quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE;

-- Make content_id nullable since we'll have either content_id or quiz_id
ALTER TABLE public.likes
ALTER COLUMN content_id DROP NOT NULL;

-- Add check constraint to ensure either content_id or quiz_id is present
ALTER TABLE public.likes
ADD CONSTRAINT likes_content_or_quiz_check 
CHECK (
  (content_id IS NOT NULL AND quiz_id IS NULL) OR 
  (content_id IS NULL AND quiz_id IS NOT NULL)
);

-- Update RLS policies for likes
DROP POLICY IF EXISTS "Users can like content" ON public.likes;
DROP POLICY IF EXISTS "Users can unlike content" ON public.likes;

CREATE POLICY "Users can like content or quizzes"
ON public.likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike content or quizzes"
ON public.likes
FOR DELETE
USING (auth.uid() = user_id);

-- Add quiz_id column to saves table
ALTER TABLE public.saves
ADD COLUMN quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE;

-- Make content_id nullable
ALTER TABLE public.saves
ALTER COLUMN content_id DROP NOT NULL;

-- Add check constraint
ALTER TABLE public.saves
ADD CONSTRAINT saves_content_or_quiz_check 
CHECK (
  (content_id IS NOT NULL AND quiz_id IS NULL) OR 
  (content_id IS NULL AND quiz_id IS NOT NULL)
);

-- Update RLS policies for saves
DROP POLICY IF EXISTS "Users can save content" ON public.saves;
DROP POLICY IF EXISTS "Users can unsave content" ON public.saves;

CREATE POLICY "Users can save content or quizzes"
ON public.saves
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave content or quizzes"
ON public.saves
FOR DELETE
USING (auth.uid() = user_id);

-- Add quiz_id column to comments table
ALTER TABLE public.comments
ADD COLUMN quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE;

-- Make content_id nullable
ALTER TABLE public.comments
ALTER COLUMN content_id DROP NOT NULL;

-- Add check constraint
ALTER TABLE public.comments
ADD CONSTRAINT comments_content_or_quiz_check 
CHECK (
  (content_id IS NOT NULL AND quiz_id IS NULL) OR 
  (content_id IS NULL AND quiz_id IS NOT NULL)
);

-- No need to update comments RLS policies as they already check user_id