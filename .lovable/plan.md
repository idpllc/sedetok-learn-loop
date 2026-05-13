## Objetivo

Permitir que desde un Notebook, el estudiante lance una "Trivia del tema" que:
1. Detecta/normaliza el tema del cuaderno a partir de sus fuentes.
2. Si no existen preguntas para ese tema, las genera con IA (20 preguntas de opción múltiple).
3. Empareja en una sala hasta 30 estudiantes que estén estudiando el mismo tema y jueguen en vivo.
4. Otorga XP y queda registrado en el ranking de trivia existente.

## Flujo de usuario

1. Dentro del Notebook, nueva tarjeta "Trivia del tema" junto a Cápsulas / Mapas mentales.
2. Al pulsar "Jugar trivia":
   - Se calcula el `topic_key` del cuaderno (slug normalizado del tema central + materia).
   - Se busca una sala abierta del mismo `topic_key` con menos de 30 jugadores y estado `waiting`.
   - Si existe → se une. Si no → se crea sala nueva y se vuelve host.
3. Lobby muestra: tema, materia, lista de jugadores (avatar + nombre), contador "X/30", botón "Iniciar" (host) y autoinicio a los 60s o al llegar a 30.
4. Si el banco de preguntas para ese `topic_key` no existe, edge function las genera (20 preguntas A/B/C/D) usando las fuentes del cuaderno + Lovable AI (`google/gemini-2.5-flash`).
5. Juego: 20 rondas, 15s por pregunta, puntos por acierto + bonus por rapidez. Sincronización por Supabase Realtime.
6. Resultados: podio, XP otorgado (+100 ganador, +50 resto que terminen), botón "Volver al cuaderno" y "Revancha".

## Cambios técnicos

### Base de datos (migración)

- `notebook_trivia_topics`:
  - `topic_key` (text, unique), `title`, `subject`, `description`, `source_summary`, `created_at`.
- `notebook_trivia_questions`:
  - `topic_key` (fk), `position` (1–20), `question`, `options` (jsonb 4 opciones), `correct_index` (0–3), `explanation`.
- `notebook_trivia_rooms`:
  - `id`, `topic_key`, `notebook_id` (referencia origen, opcional), `host_user_id`, `status` (`waiting|in_progress|finished`), `max_players` default 30, `started_at`, `finished_at`, `created_at`.
- `notebook_trivia_room_players`:
  - `room_id`, `user_id`, `score` int default 0, `correct_count` int default 0, `joined_at`, unique(room_id, user_id).
- `notebook_trivia_answers`:
  - `room_id`, `user_id`, `question_position`, `selected_index`, `is_correct`, `time_ms`, `answered_at`.

RLS:
- Topics y questions: lectura para autenticados; escritura sólo edge function (service role).
- Rooms: lectura para participantes y para autenticados que buscan sala con mismo `topic_key` en `waiting`. Insert por autenticados. Update sólo host o edge function.
- Players: insert para sí mismo si la sala está `waiting` y tiene cupo (<30); select participantes.
- Answers: insert sólo para sí mismo durante `in_progress`; select participantes.

Realtime: habilitar publication en rooms, players, answers.

Trigger: al pasar `status='finished'`, sumar XP a `profiles.experience_points` (+100 al top1, +50 a quienes contestaron al menos 10) reusando patrón existente de `user_xp_log` con `action_type='notebook_trivia'`.

### Edge functions

1. `notebook-trivia-resolve-topic` (POST)
   - Input: `notebookId`.
   - Lee fuentes (titles + extracted_text), llama IA para extraer `title`, `subject`, `topic_key` (slug, sin tildes, lower, máx 60 chars), `summary`.
   - Upsert en `notebook_trivia_topics`. Devuelve el topic.

2. `notebook-trivia-generate-questions` (POST)
   - Input: `topic_key`, `notebookId` (para contexto si hace falta).
   - Si ya existen 20 preguntas → return existentes.
   - Si no, genera con `google/gemini-2.5-flash` vía tool call `create_questions` (array 20 con `question`, `options[4]`, `correct_index`, `explanation`).
   - Inserta y devuelve.

3. `notebook-trivia-join-or-create` (POST)
   - Input: `topic_key`, `notebookId`.
   - Busca sala `waiting` con cupo del mismo topic; si no, crea. Inserta jugador. Devuelve `room`.

4. `notebook-trivia-start` (POST, sólo host) → cambia a `in_progress`, fija `started_at`.

5. `notebook-trivia-submit-answer` (POST) → registra respuesta, calcula puntos = base 100 + bonus por velocidad (max 50), actualiza `score` del player.

6. `notebook-trivia-finish` (POST, host o auto) → marca finished, dispara XP.

Todas con `verify_jwt = true` implícito + validación del `user_id`.

### Frontend

Nuevos archivos:
- `src/hooks/useNotebookTrivia.tsx` — wrappers de las edge functions y suscripciones realtime (room, players, answers).
- `src/components/notebook/TriviaTopicCard.tsx` — tarjeta CTA dentro del notebook.
- `src/components/notebook/NotebookTriviaModal.tsx` — modal con 3 fases: `lobby`, `playing`, `results`.
- `src/components/notebook/NotebookTriviaLobby.tsx` — lista de jugadores, contador, botón iniciar.
- `src/components/notebook/NotebookTriviaPlay.tsx` — pregunta actual, opciones, temporizador 15s, marcador en vivo.
- `src/components/notebook/NotebookTriviaResults.tsx` — podio + XP + acciones.

Integración:
- En `src/pages/Notebook.tsx` añadir la `TriviaTopicCard` y abrir el modal al hacer click.
- Reutilizar tokens semánticos (acento rosa #F6339A para CTA principal según memoria).

### Reglas de juego
- 20 preguntas por partida, 15 s c/u, lectura de explicación 3 s.
- Puntuación: 100 si acierta + `floor((tiempo_restante_ms / 15000) * 50)`.
- Si jugador no responde a tiempo → 0 puntos.
- Auto-avance del host (cliente) o servidor mediante polling/realtime cada 1 s.

### XP / Ranking
- Reusa `user_xp_log` con `action_type='notebook_trivia_win'` (+100) y `notebook_trivia_play'` (+50). Sin tocar el ranking de trivia 1v1 existente.

## Fuera de alcance (esta entrega)
- Chat dentro de la sala.
- Invitación directa por enlace (se podrá agregar después; el matching por `topic_key` ya cubre el caso principal).
- Modo equipos.

¿Apruebas el plan para implementarlo?
