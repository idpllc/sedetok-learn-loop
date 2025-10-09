import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useUserContent = (userId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: userContent, isLoading } = useQuery({
    queryKey: ["userContent", userId],
    queryFn: async () => {
      let targetUserId = userId;
      let isOwnContent = false;
      
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuario no autenticado");
        targetUserId = user.id;
        isOwnContent = true;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        isOwnContent = user?.id === targetUserId;
      }

      let query = supabase
        .from("content")
        .select("*")
        .eq("creator_id", targetUserId);

      // Only filter by is_public if viewing someone else's profile
      if (!isOwnContent) {
        query = query.eq("is_public", true);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const { error } = await supabase
        .from("content")
        .delete()
        .eq("id", contentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userContent"] });
      toast({
        title: "Contenido eliminado",
        description: "El contenido ha sido eliminado exitosamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ 
      contentId, 
      updates 
    }: { 
      contentId: string; 
      updates: { 
        title?: string; 
        description?: string; 
        is_public?: boolean;
        tags?: string[];
        video_url?: string;
        document_url?: string;
        thumbnail_url?: string;
      } 
    }) => {
      const { error } = await supabase
        .from("content")
        .update(updates)
        .eq("id", contentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userContent"] });
      toast({
        title: "Contenido actualizado",
        description: "Los cambios se guardaron correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    userContent,
    isLoading,
    deleteMutation,
    updateMutation,
  };
};
