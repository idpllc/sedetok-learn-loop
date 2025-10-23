-- First, find and clean up duplicate documents
-- Keep only the oldest record for each duplicate, set others to NULL
WITH duplicates AS (
  SELECT 
    id,
    tipo_documento,
    numero_documento,
    ROW_NUMBER() OVER (
      PARTITION BY tipo_documento, numero_documento 
      ORDER BY created_at ASC
    ) as rn
  FROM public.profiles
  WHERE tipo_documento IS NOT NULL 
    AND numero_documento IS NOT NULL
)
UPDATE public.profiles
SET 
  tipo_documento = NULL,
  numero_documento = NULL
FROM duplicates
WHERE profiles.id = duplicates.id
  AND duplicates.rn > 1;

-- Now create the unique constraint for document identification
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_document 
ON public.profiles (tipo_documento, numero_documento) 
WHERE tipo_documento IS NOT NULL AND numero_documento IS NOT NULL;

-- Clean up duplicate NITs - keep only the oldest
WITH duplicate_nits AS (
  SELECT 
    id,
    nit,
    ROW_NUMBER() OVER (
      PARTITION BY nit 
      ORDER BY created_at ASC
    ) as rn
  FROM public.institutions
  WHERE nit IS NOT NULL
)
UPDATE public.institutions
SET nit = NULL
FROM duplicate_nits
WHERE institutions.id = duplicate_nits.id
  AND duplicate_nits.rn > 1;

-- Create unique constraint for institution NIT
CREATE UNIQUE INDEX IF NOT EXISTS unique_institution_nit 
ON public.institutions (nit) 
WHERE nit IS NOT NULL;

-- Clean up duplicate DANE codes - keep only the oldest
WITH duplicate_dane AS (
  SELECT 
    id,
    codigo_dane,
    ROW_NUMBER() OVER (
      PARTITION BY codigo_dane 
      ORDER BY created_at ASC
    ) as rn
  FROM public.institutions
  WHERE codigo_dane IS NOT NULL
)
UPDATE public.institutions
SET codigo_dane = NULL
FROM duplicate_dane
WHERE institutions.id = duplicate_dane.id
  AND duplicate_dane.rn > 1;

-- Create unique constraint for institution DANE code
CREATE UNIQUE INDEX IF NOT EXISTS unique_institution_codigo_dane 
ON public.institutions (codigo_dane) 
WHERE codigo_dane IS NOT NULL;