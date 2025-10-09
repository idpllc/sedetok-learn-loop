import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export const useFollow = (targetUserId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if current user follows target user
  const { data: isFollowing, isLoading } = useQuery({
    queryKey: ["following", user?.id, targetUserId],
    queryFn: async () => {
      if (!user || !targetUserId || user.id === targetUserId) return false;

      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
  });

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!user) throw new Error("Debes iniciar sesión");

      const { error } = await supabase
        .from("follows")
        .insert({
          follower_id: user.id,
          following_id: userId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["following"] });
      toast({
        title: "Seguido correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al seguir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!user) throw new Error("Debes iniciar sesión");

      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["following"] });
      toast({
        title: "Dejaste de seguir",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al dejar de seguir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleFollow = (userId: string) => {
    if (isFollowing) {
      unfollowMutation.mutate(userId);
    } else {
      followMutation.mutate(userId);
    }
  };

  return {
    isFollowing,
    isLoading,
    toggleFollow,
    isProcessing: followMutation.isPending || unfollowMutation.isPending,
  };
};
