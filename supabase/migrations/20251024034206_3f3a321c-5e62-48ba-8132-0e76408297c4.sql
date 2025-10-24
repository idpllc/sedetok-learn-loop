-- Primero, eliminar el enum anterior si existe y crear uno nuevo con los 12 tipos de inteligencias múltiples
DROP TYPE IF EXISTS tipo_aprendizaje_new CASCADE;

CREATE TYPE tipo_aprendizaje_new AS ENUM (
  'Lingüística',
  'Lógico-Matemática',
  'Espacial',
  'Musical',
  'Cinético-Corporal',
  'Interpersonal',
  'Intrapersonal',
  'Naturalista',
  'Existencial',
  'Creativa',
  'Digital',
  'Emocional'
);

-- Actualizar la columna tipo_aprendizaje en la tabla learning_paths
ALTER TABLE learning_paths 
  ALTER COLUMN tipo_aprendizaje DROP DEFAULT;

ALTER TABLE learning_paths
  ALTER COLUMN tipo_aprendizaje TYPE tipo_aprendizaje_new 
  USING CASE
    WHEN tipo_aprendizaje::text = 'Visual' THEN 'Espacial'::tipo_aprendizaje_new
    WHEN tipo_aprendizaje::text = 'Auditivo' THEN 'Musical'::tipo_aprendizaje_new
    WHEN tipo_aprendizaje::text = 'Kinestésico' THEN 'Cinético-Corporal'::tipo_aprendizaje_new
    WHEN tipo_aprendizaje::text = 'Lógico' THEN 'Lógico-Matemática'::tipo_aprendizaje_new
    ELSE 'Lingüística'::tipo_aprendizaje_new
  END;

-- Actualizar la columna tipo_aprendizaje en la tabla profiles
ALTER TABLE profiles
  ALTER COLUMN tipo_aprendizaje DROP DEFAULT;

ALTER TABLE profiles
  ALTER COLUMN tipo_aprendizaje TYPE tipo_aprendizaje_new 
  USING CASE
    WHEN tipo_aprendizaje::text = 'Visual' THEN 'Espacial'::tipo_aprendizaje_new
    WHEN tipo_aprendizaje::text = 'Auditivo' THEN 'Musical'::tipo_aprendizaje_new
    WHEN tipo_aprendizaje::text = 'Kinestésico' THEN 'Cinético-Corporal'::tipo_aprendizaje_new
    WHEN tipo_aprendizaje::text = 'Lógico' THEN 'Lógico-Matemática'::tipo_aprendizaje_new
    ELSE NULL
  END;

-- Eliminar el enum anterior
DROP TYPE IF EXISTS tipo_aprendizaje CASCADE;

-- Renombrar el nuevo enum
ALTER TYPE tipo_aprendizaje_new RENAME TO tipo_aprendizaje;