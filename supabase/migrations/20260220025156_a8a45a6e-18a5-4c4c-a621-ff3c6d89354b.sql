
-- ============================================================
-- FIX: Eliminar grupos académicos y conversaciones duplicadas
-- ============================================================

-- 1. Para cada institución+nombre+sede, conservar SOLO el grupo más antiguo
--    y mover todos los miembros al grupo que se conserva
DO $$
DECLARE
  dup RECORD;
  keep_id uuid;
  dup_id uuid;
BEGIN
  -- Find duplicate academic_groups (same institution_id + name + sede_id)
  FOR dup IN
    SELECT institution_id, name, sede_id, array_agg(id ORDER BY created_at ASC) AS ids
    FROM public.academic_groups
    GROUP BY institution_id, name, sede_id
    HAVING count(*) > 1
  LOOP
    keep_id := dup.ids[1]; -- oldest one to keep

    FOREACH dup_id IN ARRAY dup.ids[2:] LOOP
      -- Move members to the kept group
      UPDATE public.academic_group_members
        SET group_id = keep_id
        WHERE group_id = dup_id
          AND NOT EXISTS (
            SELECT 1 FROM public.academic_group_members
            WHERE group_id = keep_id AND user_id = academic_group_members.user_id
          );

      -- Move chat_conversations referencing the duplicate group to the kept group
      -- (only if the kept group doesn't already have a conversation)
      UPDATE public.chat_conversations
        SET academic_group_id = keep_id
        WHERE academic_group_id = dup_id
          AND NOT EXISTS (
            SELECT 1 FROM public.chat_conversations
            WHERE academic_group_id = keep_id AND type = 'group'
          );

      -- Delete conversations still pointing to the duplicate (already have one for keep_id)
      DELETE FROM public.chat_participants
        WHERE conversation_id IN (
          SELECT id FROM public.chat_conversations WHERE academic_group_id = dup_id
        );
      DELETE FROM public.chat_messages
        WHERE conversation_id IN (
          SELECT id FROM public.chat_conversations WHERE academic_group_id = dup_id
        );
      DELETE FROM public.chat_conversations WHERE academic_group_id = dup_id;

      -- Delete the duplicate academic group
      DELETE FROM public.academic_group_members WHERE group_id = dup_id;
      DELETE FROM public.academic_groups WHERE id = dup_id;

      RAISE NOTICE 'Merged duplicate academic_group % into %', dup_id, keep_id;
    END LOOP;
  END LOOP;
END $$;

-- 2. Para cada academic_group_id, conservar SOLO la conversación de grupo más antigua
DO $$
DECLARE
  dup RECORD;
  keep_conv_id uuid;
  dup_conv_id uuid;
BEGIN
  FOR dup IN
    SELECT academic_group_id, array_agg(id ORDER BY created_at ASC) AS ids
    FROM public.chat_conversations
    WHERE academic_group_id IS NOT NULL AND type = 'group'
    GROUP BY academic_group_id
    HAVING count(*) > 1
  LOOP
    keep_conv_id := dup.ids[1];

    FOREACH dup_conv_id IN ARRAY dup.ids[2:] LOOP
      -- Move participants to the kept conversation
      UPDATE public.chat_participants
        SET conversation_id = keep_conv_id
        WHERE conversation_id = dup_conv_id
          AND NOT EXISTS (
            SELECT 1 FROM public.chat_participants
            WHERE conversation_id = keep_conv_id AND user_id = chat_participants.user_id
          );

      -- Move messages to the kept conversation
      UPDATE public.chat_messages
        SET conversation_id = keep_conv_id
        WHERE conversation_id = dup_conv_id;

      -- Delete remaining participants and the duplicate conversation
      DELETE FROM public.chat_participants WHERE conversation_id = dup_conv_id;
      DELETE FROM public.chat_conversations WHERE id = dup_conv_id;

      RAISE NOTICE 'Merged duplicate chat_conversation % into %', dup_conv_id, keep_conv_id;
    END LOOP;
  END LOOP;
END $$;

-- 3. Agregar índice único en academic_groups para prevenir duplicados futuros
--    (institution_id + name + sede_id). Usamos un índice parcial para manejar sede_id NULL.
CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_groups_inst_name_sede
  ON public.academic_groups (institution_id, name, sede_id)
  WHERE sede_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_groups_inst_name_no_sede
  ON public.academic_groups (institution_id, name)
  WHERE sede_id IS NULL;

-- 4. Índice único en chat_conversations por academic_group_id (solo grupos)
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_conv_academic_group
  ON public.chat_conversations (academic_group_id)
  WHERE academic_group_id IS NOT NULL AND type = 'group';
