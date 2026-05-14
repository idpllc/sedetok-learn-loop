# Plan: Editor enriquecido de Presentaciones

Objetivo: que las presentaciones se vean como las imágenes (fondos sólidos con tarjetas y contraste correcto), que la IA genere ese tipo de slides, y que el docente pueda editarlas inline con un editor estilo Google Slides.

---

## 1. Sistema de Temas y Fondos (con contraste garantizado)

Nuevo módulo `src/lib/presentationThemes.ts` con presets:
- `teal` (verde azulado del ejemplo, cards `#0D6661` sobre `#0E7C6E`)
- `indigo`, `slate`, `cream`, `dark`, `coral`, `forest`
- Cada tema define: `bg`, `cardBg`, `textOn` (claro/oscuro automático), `accent`, `mutedText`, `iconColor`.

`presentation_data.meta.theme = "teal"` y opcional `meta.background = { type: "color"|"gradient"|"image", value }` por slide o global.

Renderer aplica clases con tokens del tema → contraste garantizado (texto blanco sobre cards oscuras, etc.). Imágenes embebidas reciben `ring`/`shadow` claro para resaltar sobre fondos oscuros.

## 2. Nuevos layouts tipo "tarjetas"

Añadir a `Slide.layout`:
- `cards_3` — título + 3 tarjetas (ícono + subtítulo + texto). Es exactamente la slide del ejemplo.
- `cards_2` y `cards_4` — variantes.
- `cards_image` — 3 tarjetas con imagen arriba (segunda imagen del usuario).
- `section_header` — divisor de sección a pantalla completa.

Cada tarjeta: `{ icon?: string (lucide name), title: string, body: string, image_url?: string }`.

Modelo Slide extendido:
```ts
cards?: Array<{ icon?: string; title: string; body: string; image_url?: string }>;
background?: { type: "color"|"gradient"|"image"; value: string };
```

Renderer añade los nuevos casos con `lucide-react` dinámico para iconos.

## 3. IA: generación rica con tarjetas

Actualizar `supabase/functions/create-presentation-standalone/index.ts` y `notebook-create-capsule`:
- Pasar `theme` (default `teal`) al guardar.
- Prompt que pida explícitamente layouts de tarjetas (`cards_3`, `cards_image`) en al menos 40% de las slides cuando `text_density != low`.
- Para cada tarjeta: ícono lucide sugerido (lista cerrada de ~30 nombres), título corto y body de 2-3 frases con `**negrita**` en términos clave.
- Si `presentation_type=slides`: mezcla balanceada `title`, `cards_3`, `cards_image`, `two_column`, `quote`, `closing`.

## 4. Editor inline de presentaciones

Nueva ruta `/presentation/:id/edit` (`src/pages/PresentationEdit.tsx`) accesible solo al `creator_id`, con UI tal cual las imágenes:

- **Top bar**: título editable, "Público/Privado", botones guardar/compartir/presentar.
- **Toolbar contextual**:
  - Cuando hay texto seleccionado: Familia tipográfica, tamaño −/+, **B** _I_ U, alineación, listas, color, "Editar con IA".
  - Cuando no: Texto, Imagen, Vídeo, Tabla, Forma, Editar con IA, **Temas**, **Fondo**.
- **Sidebar izquierda**: thumbnails (drag-reorder, duplicar, eliminar, "Añadir diapositiva" con submenu IA/blank/layouts).
- **Canvas central**: slide actual a escala (reusar `ScaledSlide` pattern del skill `slides-app`, fixed 1920×1080).
- **Edición inline**: cada bloque (`title`, `subtitle`, `bullets[i]`, `cards[i].title`, `cards[i].body`) usa `contentEditable` con guardado debounced (500 ms) a `presentation_data.slides`.
- **Panel Temas**: grid con previews de cada tema → cambia `meta.theme` global.
- **Panel Fondo**: color picker, gradiente, subir imagen (S3) — aplica a slide o todas.
- **Imágenes**: clic en imagen → reemplazar/eliminar/regenerar con IA.

Persistencia: cada cambio hace `update content set presentation_data = ...` con `eq creator_id`. Optimistic UI + toast en error.

## 5. Visualizador

`PresentationView.tsx`:
- Aplica `theme` y `background` al `SlideRenderer`.
- Botón "Editar" visible solo al creador → navega a `/presentation/:id/edit`.
- Soporta los nuevos layouts (`cards_*`, `section_header`) y export PDF correspondiente.

## 6. Migraciones

Sin migración SQL nueva: todo vive dentro del JSONB `presentation_data`. Solo actualizar el shape en TS y manejar retro-compatibilidad (slides viejas sin `cards` siguen funcionando).

---

## Orden de ejecución

1. `presentationThemes.ts` + nuevos tipos `Slide` + renderer con `cards_3`/`cards_image`/`section_header`.
2. Actualizar `PresentationView` para aplicar tema y nuevos layouts (resultado visual igual al ejemplo).
3. Edge functions: prompt rico con tarjetas + tema.
4. `PresentationEdit.tsx`: sidebar + canvas + edición inline + autosave.
5. Toolbar con Temas/Fondo/Texto/Imagen y formato tipográfico.
6. Botón "Editar" en `PresentationView` para el creador.

## Notas técnicas

- Iconos: importar todos los de la lista cerrada estáticamente para evitar `import()` dinámico en Vite.
- ContentEditable: usar un wrapper que serialice a markdown simple (`**bold**`, `*italic*`) para mantener compatibilidad con `renderInline`.
- Autosave: hook `usePresentationAutosave(id, data)` con debounce + abort controller.
- Subida de imágenes: reusar `useS3Upload`.
- Mantener compatibilidad con presentaciones existentes (sin `theme` → default `teal`; sin `cards` → render normal).
