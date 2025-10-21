-- Add institution configuration fields
ALTER TABLE institutions
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS sede_academico_api_url text,
ADD COLUMN IF NOT EXISTS last_sync_at timestamp with time zone;

-- Create institution achievements table
CREATE TABLE IF NOT EXISTS institution_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  achievement_type text NOT NULL,
  name text NOT NULL,
  description text,
  threshold integer NOT NULL,
  icon text,
  earned_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on institution_achievements
ALTER TABLE institution_achievements ENABLE ROW LEVEL SECURITY;

-- Policies for institution_achievements
CREATE POLICY "Institution achievements are viewable by members"
ON institution_achievements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM institution_members
    WHERE institution_members.institution_id = institution_achievements.institution_id
      AND institution_members.user_id = auth.uid()
      AND institution_members.status = 'active'
  )
);

CREATE POLICY "Institution admins can manage achievements"
ON institution_achievements
FOR ALL
USING (is_institution_admin(auth.uid(), institution_id))
WITH CHECK (is_institution_admin(auth.uid(), institution_id));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_institution_achievements_institution_id 
ON institution_achievements(institution_id);

-- Function to calculate institution XP per capita
CREATE OR REPLACE FUNCTION calculate_institution_xp_per_capita(p_institution_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_xp bigint;
  v_member_count integer;
  v_xp_per_capita numeric;
BEGIN
  -- Get total XP from all members
  SELECT COALESCE(SUM(p.experience_points), 0)
  INTO v_total_xp
  FROM institution_members im
  JOIN profiles p ON p.id = im.user_id
  WHERE im.institution_id = p_institution_id
    AND im.status = 'active';
  
  -- Get active member count
  SELECT COUNT(*)
  INTO v_member_count
  FROM institution_members
  WHERE institution_id = p_institution_id
    AND status = 'active';
  
  -- Calculate per capita (avoid division by zero)
  IF v_member_count > 0 THEN
    v_xp_per_capita := v_total_xp::numeric / v_member_count;
  ELSE
    v_xp_per_capita := 0;
  END IF;
  
  RETURN v_xp_per_capita;
END;
$$;