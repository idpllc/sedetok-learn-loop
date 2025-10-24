import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface EvaluationEvent {
  id: string;
  quiz_id: string;
  creator_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  access_code: string;
  require_authentication: boolean;
  allow_multiple_attempts: boolean;
  show_results_immediately: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateEvaluationEventInput {
  quiz_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  require_authentication?: boolean;
  allow_multiple_attempts?: boolean;
  show_results_immediately?: boolean;
}

export const useEvaluationEvents = (quizId?: string, eventId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch events created by the user
  const { data: events, isLoading } = useQuery({
    queryKey: ["evaluation-events", user?.id, quizId],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("quiz_evaluation_events")
        .select("*, quizzes(title)")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (quizId) {
        query = query.eq("quiz_id", quizId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get results for a specific event
  const { data: eventResults, isLoading: resultsLoading } = useQuery({
    queryKey: ["evaluation-event-results", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      const { data, error } = await supabase
        .from("user_quiz_results")
        .select(`
          *,
          profiles:user_id (
            username,
            full_name,
            avatar_url,
            numero_documento
          )
        `)
        .eq("evaluation_event_id", eventId)
        .order("completed_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  // Create evaluation event
  const createEvent = useMutation({
    mutationFn: async (input: CreateEvaluationEventInput) => {
      if (!user) throw new Error("Usuario no autenticado");

      // Generate access code
      const { data: codeData, error: codeError } = await supabase
        .rpc("generate_access_code");

      if (codeError) throw codeError;

      const { data, error } = await supabase
        .from("quiz_evaluation_events")
        .insert({
          ...input,
          creator_id: user.id,
          access_code: codeData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-events"] });
      toast({
        title: "Evento creado",
        description: "El evento de evaluación ha sido creado exitosamente",
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

  // Update evaluation event
  const updateEvent = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EvaluationEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from("quiz_evaluation_events")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-events"] });
      toast({
        title: "Evento actualizado",
        description: "El evento ha sido actualizado exitosamente",
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

  // Delete evaluation event
  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("quiz_evaluation_events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-events"] });
      toast({
        title: "Evento eliminado",
        description: "El evento ha sido eliminado exitosamente",
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

  // Get event by access code
  const getEventByAccessCode = async (accessCode: string) => {
    const { data, error } = await supabase
      .from("quiz_evaluation_events")
      .select("*, quizzes(*)")
      .eq("access_code", accessCode.toUpperCase())
      .single();

    if (error) throw error;
    return data;
  };

  return {
    events,
    isLoading,
    createEvent: createEvent.mutate,
    updateEvent: updateEvent.mutate,
    deleteEvent: deleteEvent.mutate,
    getEventByAccessCode,
    eventResults,
    resultsLoading,
    isCreating: createEvent.isPending,
  };
};
