-- Crear tabla para variaciones de hoja de vida
CREATE TABLE IF NOT EXISTS cv_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_position text NOT NULL,
  company_name text,
  job_description text,
  
  -- Datos personalizados para esta variación
  custom_bio text,
  highlighted_skills jsonb DEFAULT '[]'::jsonb,
  highlighted_experience jsonb DEFAULT '[]'::jsonb,
  highlighted_projects jsonb DEFAULT '[]'::jsonb,
  highlighted_education jsonb DEFAULT '[]'::jsonb,
  additional_sections jsonb DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_with_ai boolean DEFAULT false,
  ai_prompt text,
  is_favorite boolean DEFAULT false,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE cv_variations ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Users can view own CV variations"
  ON cv_variations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own CV variations"
  ON cv_variations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own CV variations"
  ON cv_variations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own CV variations"
  ON cv_variations FOR DELETE
  USING (auth.uid() = user_id);

-- Índices para optimizar búsquedas
CREATE INDEX idx_cv_variations_user_id ON cv_variations(user_id);
CREATE INDEX idx_cv_variations_created_at ON cv_variations(user_id, created_at DESC);
CREATE INDEX idx_cv_variations_favorite ON cv_variations(user_id, is_favorite) WHERE is_favorite = true;

-- Comentarios
COMMENT ON TABLE cv_variations IS 'Variaciones personalizadas de hojas de vida por usuario';
COMMENT ON COLUMN cv_variations.target_position IS 'Cargo al que se postula';
COMMENT ON COLUMN cv_variations.highlighted_skills IS 'Habilidades destacadas para esta posición';
COMMENT ON COLUMN cv_variations.created_with_ai IS 'Indica si fue generada con asistencia de IA';