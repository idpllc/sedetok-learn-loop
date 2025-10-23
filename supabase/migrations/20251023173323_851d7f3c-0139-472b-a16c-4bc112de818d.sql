-- Agregar campos adicionales al perfil profesional
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS cover_image_url text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{"linkedin": "", "instagram": "", "facebook": "", "tiktok": "", "github": "", "twitter": ""}'::jsonb,
ADD COLUMN IF NOT EXISTS work_experience jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS projects jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS skills jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS complementary_education jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS custom_url text UNIQUE,
ADD COLUMN IF NOT EXISTS profile_views integer DEFAULT 0;

-- Crear índice para búsqueda rápida por URL personalizada
CREATE INDEX IF NOT EXISTS idx_profiles_custom_url ON profiles(custom_url) WHERE custom_url IS NOT NULL;

-- Comentarios para documentar los campos
COMMENT ON COLUMN profiles.cover_image_url IS 'URL de la imagen de portada del perfil';
COMMENT ON COLUMN profiles.social_links IS 'Enlaces a redes sociales en formato JSON';
COMMENT ON COLUMN profiles.work_experience IS 'Array de experiencias laborales en formato JSON';
COMMENT ON COLUMN profiles.projects IS 'Array de proyectos personales/colaborativos en formato JSON';
COMMENT ON COLUMN profiles.skills IS 'Array de habilidades técnicas y blandas con niveles';
COMMENT ON COLUMN profiles.complementary_education IS 'Array de formación complementaria adicional';
COMMENT ON COLUMN profiles.custom_url IS 'URL personalizada del perfil público (ej: username)';
COMMENT ON COLUMN profiles.profile_views IS 'Contador de visualizaciones del perfil';