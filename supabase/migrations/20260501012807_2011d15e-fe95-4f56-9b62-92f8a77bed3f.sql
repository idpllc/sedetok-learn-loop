ALTER TABLE public.content ADD COLUMN IF NOT EXISTS reading_type TEXT;

ALTER TABLE public.content
  DROP CONSTRAINT IF EXISTS content_reading_type_check;

ALTER TABLE public.content
  ADD CONSTRAINT content_reading_type_check
  CHECK (reading_type IS NULL OR reading_type IN ('libro','resumen','ensayo','notas','glosario'));

UPDATE public.content
  SET reading_type = 'resumen'
  WHERE content_type = 'lectura' AND reading_type IS NULL;