import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ActionType = 'view_complete' | 'like' | 'save' | 'comment' | 'path_complete';

export const useXP = () => {
  const deductXP = async (amount: number, reason: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    try {
      // Get current XP
      const { data: profile } = await supabase
        .from('profiles')
        .select('experience_points')
        .eq('id', user.id)
        .single();

      if (!profile) return false;

      const currentXP = profile.experience_points || 0;
      const newXP = Math.max(0, currentXP - amount); // No bajar de 0

      // Log the XP deduction
      const { error: logError } = await supabase
        .from('user_xp_log')
        .insert({
          user_id: user.id,
          action_type: reason,
          xp_amount: -amount // Negative value for deductions
        });

      if (logError) throw logError;

      // Update XP
      const { error } = await supabase
        .from('profiles')
        .update({ experience_points: newXP })
        .eq('id', user.id);

      if (error) throw error;

      toast.error(`-${amount} XP`, {
        description: reason,
        duration: 2000
      });

      return true;
    } catch (error) {
      console.error('Error deducting XP:', error);
      return false;
    }
  };

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

  return { awardXP, awardPathCompletionXP, deductXP };
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
