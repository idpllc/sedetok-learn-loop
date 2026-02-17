
-- Tabla de sedes institucionales
CREATE TABLE public.institution_sedes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  city TEXT,
  coordinator_user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(institution_id, name)
);

-- Habilitar RLS
ALTER TABLE public.institution_sedes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Institution members can view sedes"
  ON public.institution_sedes FOR SELECT
  USING (is_institution_member(auth.uid(), institution_id));

CREATE POLICY "Institution admins can manage sedes"
  ON public.institution_sedes FOR ALL
  USING (is_institution_admin(auth.uid(), institution_id))
  WITH CHECK (is_institution_admin(auth.uid(), institution_id));

-- Agregar sede_id a academic_groups
ALTER TABLE public.academic_groups
  ADD COLUMN sede_id UUID REFERENCES public.institution_sedes(id);

-- Trigger para updated_at
CREATE TRIGGER update_institution_sedes_updated_at
  BEFORE UPDATE ON public.institution_sedes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
