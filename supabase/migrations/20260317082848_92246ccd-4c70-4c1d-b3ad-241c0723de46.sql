-- Add unique constraint on numero_documento (excluding nulls)
CREATE UNIQUE INDEX unique_numero_documento ON public.profiles (numero_documento) WHERE numero_documento IS NOT NULL;
