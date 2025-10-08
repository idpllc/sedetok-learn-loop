import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ActionType = 'view_complete' | 'like' | 'save' | 'comment';

export const useXP = () => {
  const awardXP = async (contentId: string, actionType: ActionType) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    try {
      const { error } = await supabase.rpc('award_xp_for_action', {
        p_user_id: user.id,
        p_content_id: contentId,
        p_action_type: actionType
      });

      if (error) throw error;

      // Show XP notification
      const xpAmounts: Record<ActionType, number> = {
        'view_complete': 5,
        'like': 10,
        'save': 15,
        'comment': 20
      };

      toast.success(`¡+${xpAmounts[actionType]} XP!`, {
        description: getActionMessage(actionType),
        duration: 2000
      });
    } catch (error) {
      console.error('Error awarding XP:', error);
    }
  };

  return { awardXP };
};

const getActionMessage = (actionType: ActionType): string => {
  const messages: Record<ActionType, string> = {
    'view_complete': 'Video completado',
    'like': 'Me gusta',
    'save': 'Video guardado',
    'comment': 'Comentario publicado'
  };
  return messages[actionType];
};
