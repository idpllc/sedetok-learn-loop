-- Create function to increment shares count
CREATE OR REPLACE FUNCTION public.increment_shares_count(content_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE content
  SET shares_count = shares_count + 1
  WHERE id = content_id;
END;
$$;