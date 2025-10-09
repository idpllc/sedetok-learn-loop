-- Add onboarding tracking fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS perfil_completo_360 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_paso_actual integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_pospuesto_hasta timestamp with time zone;