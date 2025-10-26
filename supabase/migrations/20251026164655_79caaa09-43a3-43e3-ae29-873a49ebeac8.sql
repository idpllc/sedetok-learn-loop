-- Drop all duplicate triggers and keep only the main ones

-- LIKES TABLE: Drop old/duplicate triggers
DROP TRIGGER IF EXISTS on_like_insert ON public.likes;
DROP TRIGGER IF EXISTS on_like_delete ON public.likes;
DROP TRIGGER IF EXISTS on_like_created ON public.likes;
DROP TRIGGER IF EXISTS on_like_deleted ON public.likes;
DROP TRIGGER IF EXISTS trg_likes_counter_ins ON public.likes;
DROP TRIGGER IF EXISTS trg_likes_counter_del ON public.likes;

-- Create single triggers for likes
CREATE TRIGGER increment_likes_trigger
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_likes_count();

CREATE TRIGGER decrement_likes_trigger
  AFTER DELETE ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_likes_count();

-- COMMENTS TABLE: Drop old/duplicate triggers
DROP TRIGGER IF EXISTS on_comment_insert ON public.comments;
DROP TRIGGER IF EXISTS on_comment_delete ON public.comments;
DROP TRIGGER IF EXISTS on_comment_created ON public.comments;
DROP TRIGGER IF EXISTS on_comment_deleted ON public.comments;
DROP TRIGGER IF EXISTS trg_comments_counter_ins ON public.comments;
DROP TRIGGER IF EXISTS trg_comments_counter_del ON public.comments;

-- Create single triggers for comments
CREATE TRIGGER increment_comments_trigger
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_comments_count();

CREATE TRIGGER decrement_comments_trigger
  AFTER DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_comments_count();

-- SAVES TABLE: Drop old/duplicate triggers
DROP TRIGGER IF EXISTS on_save_insert ON public.saves;
DROP TRIGGER IF EXISTS on_save_delete ON public.saves;
DROP TRIGGER IF EXISTS on_save_created ON public.saves;
DROP TRIGGER IF EXISTS on_save_deleted ON public.saves;
DROP TRIGGER IF EXISTS trg_saves_counter_ins ON public.saves;
DROP TRIGGER IF EXISTS trg_saves_counter_del ON public.saves;

-- Create single triggers for saves
CREATE TRIGGER increment_saves_trigger
  AFTER INSERT ON public.saves
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_saves_count();

CREATE TRIGGER decrement_saves_trigger
  AFTER DELETE ON public.saves
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_saves_count();