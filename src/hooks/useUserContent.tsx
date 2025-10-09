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

      // Fetch regular content
      let contentQuery = supabase
        .from("content")
        .select("*")
        .eq("creator_id", targetUserId);

      if (!isOwnContent) {
        contentQuery = contentQuery.eq("is_public", true);
      }

      const { data: contentData, error: contentError } = await contentQuery.order("created_at", { ascending: false });
      if (contentError) throw contentError;

      // Fetch quizzes
      let quizQuery = supabase
        .from("quizzes")
        .select("*")
        .eq("creator_id", targetUserId);

      if (!isOwnContent) {
        quizQuery = quizQuery.eq("is_public", true);
      }

      const { data: quizData, error: quizError } = await quizQuery.order("created_at", { ascending: false });
      if (quizError) throw quizError;

      // Combine and mark quizzes with content_type
      const quizzes = (quizData || []).map(quiz => ({
        ...quiz,
        content_type: 'quiz' as const,
        likes_count: 0,
        views_count: 0,
        saves_count: 0,
        shares_count: 0,
        comments_count: 0,
        tags: [],
      }));

      // Combine both arrays and sort by created_at
      const allContent = [...(contentData || []), ...quizzes].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return allContent;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (contentId: string) => {
      // First, check which table this content belongs to
      const content = userContent?.find(c => c.id === contentId);
      
      if (content?.content_type === 'quiz') {
        // Delete from quizzes table
        const { error } = await supabase
          .from("quizzes")
          .delete()
          .eq("id", contentId);
        
        if (error) throw error;
      } else {
        // Delete from content table
        const { error } = await supabase
          .from("content")
          .delete()
          .eq("id", contentId);
        
        if (error) throw error;
      }
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
