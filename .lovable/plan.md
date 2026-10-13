# Reparar videos e imágenes rotos (Cloudinary) en rutas de aprendizaje

## Objetivo
Desde el panel de superadmin, detectar rutas cuyas cápsulas tienen videos o imágenes alojados en Cloudinary (ya no disponible) y reemplazarlos automáticamente por videos de YouTube acordes al tema de cada ruta.

## Qué verá el superadmin
Nueva pestaña **"Medios rotos"** en el panel de superadmin:
1. **Escanear**: botón que revisa todas las rutas y lista cada cápsula con un video, miniatura o documento roto (URL de Cloudinary o que no responde).
2. **Tabla por ruta**: nombre de la ruta, creador, número de cápsulas afectadas, tipo (video / imagen / documento), estado (roto, reparado, ignorado). Filtros por estado y búsqueda.
3. **Sugerencias de YouTube**: para cada cápsula de video rota, 3 videos sugeridos (miniatura, título, canal) con previsualización. Botón "Usar este video".
4. **Reparación automática**: botón "Reparar todo automáticamente" que elige el mejor video por cápsula, con barra de progreso, y un modo "solo sugerir" para revisión manual.
5. **Imágenes rotas**: se reemplaza la miniatura por la del video de YouTube elegido; si no hay video, se marca la imagen para revisión (o se quita para no mostrarse rota).
6. **Historial**: cada cambio guarda la URL anterior para poder deshacer.

## Cómo elige el video correcto
- Se arma la búsqueda con: título de la cápsula + tema/materia + título de la ruta + grado.
- La IA genera la mejor frase de búsqueda en español y luego elige, entre los resultados de YouTube, el más pertinente al tema y nivel (evita contenido no educativo).
- Solo videos incrustables y con búsqueda segura.

## Detalles técnicos
- **Detección**: función backend `scan-broken-media` (solo superadmin vía `has_role`) que recorre `learning_path_content` → `content` (`video_url`, `thumbnail_url`, `document_url`, imágenes en `rich_text`). Marca roto si contiene `res.cloudinary.com` o si un `HEAD` devuelve error/404 (con límite de concurrencia y timeout).
- **Tabla nueva** `media_repair_items`: content_id, path_id, field, old_url, status (broken/suggested/fixed/ignored), suggestions (jsonb), new_url, fixed_by, fixed_at. RLS solo superadmin.
- **Sugerencias**: función `suggest-youtube-replacements` que reutiliza `youtube-search` (YOUTUBE_API_KEY ya configurada) + Lovable AI (gemini flash) para construir la consulta y rankear resultados.
- **Reparación**: función `apply-media-repair` actualiza `content.video_url` con la URL de YouTube y `thumbnail_url` con `i.ytimg.com`; los reproductores ya soportan YouTube (`src/lib/youtube.ts`).
- **Lotes**: procesamiento en grupos de ~10 cápsulas desde el panel para no exceder tiempos ni la cuota diaria de YouTube (~100 búsquedas/día con la cuota estándar; se avisa al acercarse al límite).
- **Deshacer**: restaura `old_url` desde `media_repair_items`.
- UI: `src/components/admin/BrokenMediaManagement.tsx` agregado como pestaña en `src/pages/AdminDashboard.tsx`.

## Consideraciones
- La cuota gratuita de YouTube limita cuántas rutas se reparan por día; el proceso se puede reanudar.
- Videos propios subidos a Cloudinary que no tengan equivalente en YouTube quedarán marcados para que el creador los vuelva a subir (ahora a S3).
