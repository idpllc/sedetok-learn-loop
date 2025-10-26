-- Recalculate correct counters for games table
UPDATE public.games g
SET 
  likes_count = COALESCE((
    SELECT COUNT(*) 
    FROM public.likes 
    WHERE game_id = g.id
  ), 0),
  comments_count = COALESCE((
    SELECT COUNT(*) 
    FROM public.comments 
    WHERE game_id = g.id
  ), 0),
  saves_count = COALESCE((
    SELECT COUNT(*) 
    FROM public.saves 
    WHERE game_id = g.id
  ), 0);

-- Recalculate correct counters for content table
UPDATE public.content c
SET 
  likes_count = COALESCE((
    SELECT COUNT(*) 
    FROM public.likes 
    WHERE content_id = c.id
  ), 0),
  comments_count = COALESCE((
    SELECT COUNT(*) 
    FROM public.comments 
    WHERE content_id = c.id
  ), 0),
  saves_count = COALESCE((
    SELECT COUNT(*) 
    FROM public.saves 
    WHERE content_id = c.id
  ), 0);