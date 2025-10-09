-- Add missing onboarding fields for gamification and privacy
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferencia_recompensas text,
ADD COLUMN IF NOT EXISTS permitir_rankings boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS modo_competitivo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS perfil_publico boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS permitir_comentarios boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notificaciones_correo boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notificaciones_push boolean DEFAULT true;