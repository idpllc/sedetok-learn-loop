-- Create enums for profile fields
CREATE TYPE tipo_documento AS ENUM ('RC', 'NES', 'PPT', 'TI', 'CC', 'CE', 'TE', 'DIE', 'DESC');
CREATE TYPE genero AS ENUM ('Masculino', 'Femenino', 'Otro', 'Prefiero no decir');
CREATE TYPE tipo_usuario AS ENUM ('Estudiante', 'Docente', 'Padre', 'Institución');
CREATE TYPE nivel_educativo AS ENUM ('Preescolar', 'Primaria', 'Secundaria', 'Media', 'Universitario');
CREATE TYPE tipo_aprendizaje AS ENUM ('Visual', 'Auditivo', 'Kinestésico', 'Lógico');
CREATE TYPE preferencia_duracion AS ENUM ('Corto', 'Medio', 'Largo');
CREATE TYPE horario_estudio AS ENUM ('Mañana', 'Tarde', 'Noche');
CREATE TYPE modo_consumo AS ENUM ('Videos', 'PDF', 'Quizzes', 'Textos', 'Mixto');
CREATE TYPE frecuencia_estudio AS ENUM ('Diaria', 'Semanal', 'Esporádica');
CREATE TYPE nivel_autonomia AS ENUM ('Alta', 'Media', 'Baja');
CREATE TYPE motivacion_principal AS ENUM ('Aprender', 'Certificarme', 'Superarme', 'Jugar', 'Competir');
CREATE TYPE nivel_meta AS ENUM ('Inicial', 'Intermedio', 'Avanzado');

-- Add new columns to profiles table
ALTER TABLE public.profiles
  -- Datos generales (algunos ya existen como full_name, avatar_url, institution)
  ADD COLUMN tipo_documento tipo_documento,
  ADD COLUMN fecha_nacimiento date,
  ADD COLUMN genero genero,
  ADD COLUMN pais text,
  ADD COLUMN departamento text,
  ADD COLUMN municipio text,
  ADD COLUMN idioma_preferido text DEFAULT 'Español',
  ADD COLUMN tipo_usuario tipo_usuario DEFAULT 'Estudiante',
  ADD COLUMN nivel_educativo nivel_educativo,
  ADD COLUMN grado_actual text,
  
  -- Perfil cognitivo y de aprendizaje
  ADD COLUMN tipo_aprendizaje tipo_aprendizaje,
  ADD COLUMN nivel_motivacion integer CHECK (nivel_motivacion >= 1 AND nivel_motivacion <= 5),
  ADD COLUMN preferencia_duracion_contenido preferencia_duracion,
  ADD COLUMN horario_preferido_estudio horario_estudio,
  ADD COLUMN modo_consumo_preferido modo_consumo,
  ADD COLUMN frecuencia_estudio frecuencia_estudio,
  ADD COLUMN nivel_autonomia nivel_autonomia,
  ADD COLUMN dificultades_aprendizaje text,
  ADD COLUMN idioma_contenido_preferido text DEFAULT 'Español',
  
  -- Intereses académicos y vocacionales
  ADD COLUMN areas_interes text[],
  ADD COLUMN temas_favoritos text[],
  ADD COLUMN profesiones_de_interes text[],
  ADD COLUMN habilidades_a_desarrollar text[],
  ADD COLUMN motivaciones_principales motivacion_principal,
  ADD COLUMN nivel_meta_aprendizaje nivel_meta,
  
  -- Integración con SEDE
  ADD COLUMN id_sede uuid,
  ADD COLUMN id_grupo uuid,
  ADD COLUMN desempenos_academicos jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN recomendaciones_activas jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN rutas_aprobadas_por_docente jsonb DEFAULT '[]'::jsonb;