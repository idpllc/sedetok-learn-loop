import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ActionType = 'view_complete' | 'like' | 'save' | 'comment' | 'path_complete';

export const useXP = () => {
  const awardPathCompletionXP = async (pathId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('check_and_award_path_completion_xp', {
        p_user_id: user.id,
        p_path_id: pathId
      });

      if (error) throw error;

      // If XP was awarded (data is true), show notification
      if (data) {
        toast.success('¡+1000 XP!', {
          description: '¡Ruta de aprendizaje completada!',
          duration: 3000
        });
      }

      return data;
    } catch (error) {
      console.error('Error awarding path completion XP:', error);
      return false;
    }
  };

  const awardXP = async (contentId: string, actionType: ActionType, isQuiz: boolean = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    try {
      const { error } = await supabase.rpc('award_xp_for_action', {
        p_user_id: user.id,
        p_content_id: contentId,
        p_action_type: actionType,
        p_is_quiz: isQuiz
      });

      if (error) throw error;

      // Show XP notification
      const xpAmounts: Record<ActionType, number> = {
        'view_complete': 5,
        'like': 10,
        'save': 15,
        'comment': 20,
        'path_complete': 1000
      };

      toast.success(`¡+${xpAmounts[actionType]} XP!`, {
        description: getActionMessage(actionType),
        duration: 2000
      });
    } catch (error) {
      console.error('Error awarding XP:', error);
    }
  };

  return { awardXP, awardPathCompletionXP };
};

const getActionMessage = (actionType: ActionType): string => {
  const messages: Record<ActionType, string> = {
    'view_complete': 'Video completado',
    'like': 'Me gusta',
    'save': 'Video guardado',
    'comment': 'Comentario publicado',
    'path_complete': 'Ruta de aprendizaje completada'
  };
  return messages[actionType];
};
