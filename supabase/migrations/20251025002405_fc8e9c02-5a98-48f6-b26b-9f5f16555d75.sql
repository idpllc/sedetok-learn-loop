-- Actualizar el enum tipo_aprendizaje para que coincida con los valores del código
ALTER TYPE tipo_aprendizaje RENAME TO tipo_aprendizaje_old;

CREATE TYPE tipo_aprendizaje AS ENUM (
  'Lógico-Matemática',
  'Lingüístico-Verbal',
  'Visual-Espacial',
  'Musical',
  'Corporal-Kinestésica',
  'Interpersonal',
  'Intrapersonal',
  'Naturalista',
  'Existencial',
  'Digital-Tecnológica',
  'Creativa-Innovadora',
  'Emocional'
);

-- Actualizar las columnas que usan el enum en las tablas
ALTER TABLE learning_paths 
  ALTER COLUMN tipo_aprendizaje TYPE tipo_aprendizaje 
  USING CASE tipo_aprendizaje::text
    WHEN 'Lingüística' THEN 'Lingüístico-Verbal'
    WHEN 'Espacial' THEN 'Visual-Espacial'
    WHEN 'Cinético-Corporal' THEN 'Corporal-Kinestésica'
    WHEN 'Creativa' THEN 'Creativa-Innovadora'
    WHEN 'Digital' THEN 'Digital-Tecnológica'
    ELSE tipo_aprendizaje::text
  END::tipo_aprendizaje;

ALTER TABLE profiles 
  ALTER COLUMN tipo_aprendizaje TYPE tipo_aprendizaje 
  USING CASE tipo_aprendizaje::text
    WHEN 'Lingüística' THEN 'Lingüístico-Verbal'
    WHEN 'Espacial' THEN 'Visual-Espacial'
    WHEN 'Cinético-Corporal' THEN 'Corporal-Kinestésica'
    WHEN 'Creativa' THEN 'Creativa-Innovadora'
    WHEN 'Digital' THEN 'Digital-Tecnológica'
    ELSE tipo_aprendizaje::text
  END::tipo_aprendizaje;

-- Eliminar el enum antiguo
DROP TYPE tipo_aprendizaje_old;