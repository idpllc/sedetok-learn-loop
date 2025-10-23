-- Permitir lectura pública de progreso de usuarios (para perfiles públicos)
-- Esto permite que cualquiera pueda ver el progreso académico de otros usuarios
DROP POLICY IF EXISTS "Users can view own progress" ON user_path_progress;
DROP POLICY IF EXISTS "Institution members can view student progress" ON user_path_progress;

CREATE POLICY "Progress is publicly viewable"
ON user_path_progress
FOR SELECT
USING (true);

-- Permitir lectura pública de resultados de quizzes (para perfiles públicos)
DROP POLICY IF EXISTS "Users can view own quiz results" ON user_quiz_results;
DROP POLICY IF EXISTS "Institution members can view student quiz results" ON user_quiz_results;

CREATE POLICY "Quiz results are publicly viewable"
ON user_quiz_results
FOR SELECT
USING (true);

-- Permitir lectura pública de membresías institucionales (solo nombre de institución)
DROP POLICY IF EXISTS "members_select_admin_or_self" ON institution_members;

CREATE POLICY "Institution members are publicly viewable"
ON institution_members
FOR SELECT
USING (true);