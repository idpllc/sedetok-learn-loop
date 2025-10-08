import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useComments = (contentId: string) => {
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", contentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles:user_id (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("content_id", contentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ comment_text }: { comment_text: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      const { data, error } = await supabase
        .from("comments")
        .insert({
          content_id: contentId,
          user_id: user.id,
          comment_text,
        })
        .select()
        .single();

      if (error) throw error;

      // Increment comment count
      await supabase.rpc("increment_comments_count", { content_id: contentId });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", contentId] });
      queryClient.invalidateQueries({ queryKey: ["content"] });
      toast.success("Comentario agregado");
    },
    onError: () => {
      toast.error("Error al agregar comentario");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      // Decrement comment count
      await supabase.rpc("decrement_comments_count", { content_id: contentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", contentId] });
      queryClient.invalidateQueries({ queryKey: ["content"] });
      toast.success("Comentario eliminado");
    },
    onError: () => {
      toast.error("Error al eliminar comentario");
    },
  });

  return {
    comments,
    isLoading,
    addComment: addCommentMutation.mutate,
    deleteComment: deleteCommentMutation.mutate,
  };
};
