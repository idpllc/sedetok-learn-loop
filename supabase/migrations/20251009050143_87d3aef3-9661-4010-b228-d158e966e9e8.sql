-- Crear función para incrementar contador de shares
CREATE OR REPLACE FUNCTION increment_shares_count(content_id UUID DEFAULT NULL, quiz_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF content_id IS NOT NULL THEN
    UPDATE content SET shares_count = shares_count + 1 WHERE id = content_id;
  ELSIF quiz_id IS NOT NULL THEN
    -- Para quizzes, no actualizamos un contador porque no existe en la tabla
    -- pero la función no debe fallar
    NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;