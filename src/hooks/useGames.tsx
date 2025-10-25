import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface GameQuestion {
  id?: string;
  question_text: string;
  correct_sentence: string;
  words: string[];
  points: number;
  order_index: number;
  image_url?: string;
  video_url?: string;
}

export const useGames = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createGame = useMutation({
    mutationFn: async (gameData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase
        .from("games")
        .insert([{
          ...gameData,
          creator_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      toast({
        title: "¡Juego creado!",
        description: "Tu juego ha sido creado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateGame = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from("games")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      toast({
        title: "Juego actualizado",
        description: "Los cambios se han guardado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return { createGame, updateGame };
};

export const useGameQuestions = (gameId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: questions, isLoading } = useQuery({
    queryKey: ["game_questions", gameId],
    queryFn: async () => {
      if (!gameId) return [];
      
      const { data, error } = await supabase
        .from("game_questions")
        .select("*")
        .eq("game_id", gameId)
        .order("order_index");

      if (error) throw error;
      return data;
    },
    enabled: !!gameId,
  });

  const createQuestion = useMutation({
    mutationFn: async (questionData: GameQuestion & { game_id: string }) => {
      const { data, error } = await supabase
        .from("game_questions")
        .insert([questionData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game_questions", gameId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase
        .from("game_questions")
        .delete()
        .eq("id", questionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game_questions", gameId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return { questions, isLoading, createQuestion, deleteQuestion };
};
