import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ActionType = 'view_complete' | 'like' | 'save' | 'comment' | 'path_complete';

export const useXP = () => {
  const deductXP = async (amount: number, reason: string, quizId?: string, contentId?: string) => {
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
          xp_amount: -amount, // Negative value for deductions
          quiz_id: quizId || null,
          content_id: contentId || null
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

  const awardProfileXP = async (actionType: string, xpAmount: number, allowMultiple: boolean = true, gameId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    try {
      // For profile_360_complete and cv_variation_created, only award once
      if (!allowMultiple) {
        // Check if already awarded, including game_id for game completions
        const baseQuery = {
          user_id: user.id,
          action_type: actionType
        };
        
        const searchQuery = gameId && actionType === 'game_complete' 
          ? { ...baseQuery, game_id: gameId }
          : baseQuery;
        
        const { data: existing } = await supabase
          .from('user_xp_log')
          .select('id')
          .match(searchQuery)
          .maybeSingle();

        if (existing) {
          return false; // Already awarded
        }
      }

      // Log the XP award with game_id if provided
      const logData: any = {
        user_id: user.id,
        action_type: actionType,
        xp_amount: xpAmount
      };
      
      if (gameId) {
        logData.game_id = gameId;
      }

      const { error: logError } = await supabase
        .from('user_xp_log')
        .insert(logData);

      if (logError) throw logError;

      // Get current XP
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('experience_points')
        .eq('id', user.id)
        .single();

      if (!currentProfile) throw new Error('Profile not found');

      const newXP = (currentProfile.experience_points || 0) + xpAmount;

      // Update user's total XP
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ experience_points: newXP })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success(`¡+${xpAmount} XP!`, {
        description: getProfileActionMessage(actionType),
        duration: 2000
      });

      return true;
    } catch (error) {
      console.error('Error awarding profile XP:', error);
      return false;
    }
  };

  return { awardXP, awardPathCompletionXP, deductXP, awardProfileXP };
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

const getProfileActionMessage = (actionType: string): string => {
  const messages: Record<string, string> = {
    'profile_360_complete': 'Perfil 360 completado',
    'social_link_added': 'Red social agregada',
    'formal_education_added': 'Educación formal agregada',
    'complementary_education_added': 'Formación complementaria agregada',
    'work_experience_added': 'Experiencia laboral agregada',
    'technical_skill_added': 'Habilidad técnica agregada',
    'soft_skill_added': 'Habilidad blanda agregada',
    'cv_variation_created': 'Hoja de vida creada',
    'game_complete': 'Juego completado',
    'project_added': 'Proyecto agregado',
    'award_added': 'Premio agregado'
  };
  return messages[actionType] || 'Acción completada';
};
