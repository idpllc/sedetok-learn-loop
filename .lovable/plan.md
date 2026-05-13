# Plan: Mejoras a Cápsulas tipo Presentación

## 1. Descarga PDF + Pantalla completa en `PresentationView`
- Añadir botón **Pantalla completa** usando `document.documentElement.requestFullscreen()` con tecla `F` y manejo de `fullscreenchange`.
- Añadir botón **Descargar PDF** que renderiza cada slide a canvas con `html2canvas` y compone un PDF con `jspdf` (formato horizontal 16:9 para "Diapositivas", cuadrado 1:1 para "Tarjetas de estudio").
- Mostrar loader mientras se genera el PDF.

## 2. Creación desde el botón "Crear"
Actualmente solo se crean desde dentro de un Notebook. Agregar el tipo `presentation` a `CreateContentForm.tsx` (solo visible para `tipo_usuario === 'Docente'`).

Modos:
- **Manual**: el docente edita slide por slide con un editor sencillo (título + bullets + imagen opcional por slide). Botón "Añadir slide".
- **Con IA**: muestra el formulario IA (similar al modal del Notebook) con todos los campos de abajo + chat de instrucciones + grabación de voz.

## 3. Campos del formulario (compartidos manual/IA)
Antes del editor o de generar con IA pedir:
- `title` (texto)
- `category` / `subject` (selects existentes)
- `grade_level` (select existente)
- **`presentation_type`**: `slides` (Diapositivas 16:9) | `flashcards` (Tarjetas de estudio 1:1, contenido muy básico)
- **`language`**: `es` | `en` | `pt` | `fr`
- **`class_duration_min`**: número (5–120) — usado por la IA para calibrar nº de slides
- **`text_density`**: `low` | `medium` | `high` — controla longitud de bullets
- `tags` (chips), `description`

En modo IA además:
- `ai_instructions`: textarea libre
- **Botón micrófono** que graba audio y lo transcribe vía edge function `voice-to-text` (Whisper / OpenAI). El texto resultante se concatena al campo `ai_instructions`.

Backend:
- Migración: añadir columnas `presentation_type text default 'slides'`, `presentation_language text default 'es'`, `class_duration_min int`, `text_density text default 'medium'` en `content` (o dentro del JSON `presentation_data` si ya existe — verificar). Lo más limpio: guardarlas dentro de `presentation_data.meta` para no inflar la tabla.
- Pasar todos esos campos al edge function `notebook-create-capsule` (o a uno nuevo `presentation-create`) para que ajuste el prompt y el nº de slides ≈ `duration / 3`.
- Para `flashcards` el prompt pide tarjetas tipo pregunta/dato breve, máx 1 idea por tarjeta.

## 4. Listado en Home + Filtros
- Añadir `presentation` como tipo válido en:
  - `useContent.tsx` / `useSearchResults.tsx` (filtros por `content_type`)
  - Chips de filtro en `Index.tsx` / `SedeTok.tsx` / `Search.tsx`
  - `ContentCard.tsx`: ícono y badge "Presentación".
- En SedeTok el card debe abrir `PresentationView` o un preview embebido.

## 5. Preview en SedeTok
- En `SedeTok.tsx`, cuando `content_type === 'presentation'` renderizar un mini-preview: primer slide a escala (reuso de `ScaledSlide` de `PresentationView`) con auto-avance cada 3s sobre los primeros 3 slides, y CTA "Ver presentación completa" → navega a `/presentation/{id}`.
- Card en feed muestra thumbnail = primera slide renderizada (cliente) o `thumbnail_url` si existe.

## Dependencias nuevas
- `jspdf`, `html2canvas` (PDF en cliente)
- Edge function reutilizada para STT: si no existe, crear `voice-transcribe` usando `openai/whisper-1` o Lovable AI Gateway.

## Detalles técnicos
- Tipos compartidos: `PresentationMeta { type: 'slides'|'flashcards'; language; duration; density }` en `src/types/presentation.ts`.
- `PresentationView` lee `presentation_data.meta.type` y aplica aspect-ratio (`aspect-video` vs `aspect-square`).
- Para `flashcards`, layout simplificado: un título grande + 1-2 líneas de contenido, sin imágenes complejas (icono opcional).
- Mantener compatibilidad: presentaciones existentes sin `meta` se tratan como `slides` / `es` / densidad media.

## Orden de ejecución
1. Migración + tipos compartidos
2. PDF + Fullscreen en `PresentationView` (rápido, valor inmediato)
3. Edge function `voice-transcribe` + actualizar `notebook-create-capsule` con nuevos campos
4. `CreateContentForm`: añadir tipo Presentación con modos Manual/IA + campos + voz
5. Listado + filtros + ContentCard
6. Preview en SedeTok
