-- Agregar columna tipo_aprendizaje a learning_paths
ALTER TABLE learning_paths 
ADD COLUMN tipo_aprendizaje tipo_aprendizaje;

-- Agregar políticas RLS para learning_path_content
-- Los creadores de rutas pueden agregar contenido
CREATE POLICY "Path creators can add content"
ON learning_path_content
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM learning_paths
    WHERE learning_paths.id = learning_path_content.path_id
    AND learning_paths.creator_id = auth.uid()
  )
);

-- Los creadores de rutas pueden actualizar contenido
CREATE POLICY "Path creators can update content"
ON learning_path_content
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM learning_paths
    WHERE learning_paths.id = learning_path_content.path_id
    AND learning_paths.creator_id = auth.uid()
  )
);

-- Los creadores de rutas pueden eliminar contenido
CREATE POLICY "Path creators can delete content"
ON learning_path_content
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM learning_paths
    WHERE learning_paths.id = learning_path_content.path_id
    AND learning_paths.creator_id = auth.uid()
  )
);