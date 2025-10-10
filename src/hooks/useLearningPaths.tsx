import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useLearningPaths = (userId?: string, filter?: 'created' | 'taken' | 'all') => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: paths, isLoading } = useQuery({
    queryKey: ["learning-paths", userId, filter],
    queryFn: async () => {
      if (!userId) {
        // Public paths for non-authenticated users
        const { data, error } = await supabase
          .from("learning_paths")
          .select("*")
          .eq("is_public", true)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        return (data || []) as any[];
      }

      if (filter === 'created') {
        // Only paths created by the user
        const { data, error } = await supabase
          .from("learning_paths")
          .select("*")
          .eq("creator_id", userId)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        return (data || []) as any[];
      } else if (filter === 'taken') {
        // Only paths where user has progress (taken by the user)
        const { data: progressData, error: progressError } = await supabase
          .from("user_path_progress")
          .select("path_id")
          .eq("user_id", userId);
        
        if (progressError) throw progressError;
        
        const pathIds = [...new Set(progressData?.map(p => p.path_id) || [])];
        
        if (pathIds.length === 0) return [];
        
        const { data, error } = await supabase
          .from("learning_paths")
          .select("*")
          .in("id", pathIds)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        return (data || []) as any[];
      } else {
        // All public paths
        const { data, error } = await supabase
          .from("learning_paths")
          .select("*")
          .eq("is_public", true)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        return (data || []) as any[];
      }
    },
  }) as { data: any[] | undefined; isLoading: boolean };

  const createPath = useMutation({
    mutationFn: async (path: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase
        .from("learning_paths")
        .insert([{ ...path, creator_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-paths"] });
      toast({
        title: "Ruta creada",
        description: "La ruta de aprendizaje ha sido creada exitosamente",
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

  const updatePath = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from("learning_paths")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-paths"] });
      toast({
        title: "Ruta actualizada",
        description: "La ruta ha sido actualizada exitosamente",
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

  const deletePath = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("learning_paths").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-paths"] });
      toast({
        title: "Ruta eliminada",
        description: "La ruta ha sido eliminada exitosamente",
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

  return {
    paths,
    isLoading,
    createPath,
    updatePath,
    deletePath,
  };
};

export const usePathContent = (pathId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: contents, isLoading } = useQuery({
    queryKey: ["path-content", pathId],
    queryFn: async () => {
      if (!pathId) return [];

      const { data, error } = await supabase
        .from("learning_path_content")
        .select(`
          *,
          content(*),
          quiz:quizzes(*)
        `)
        .eq("path_id", pathId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!pathId,
  });

  const addContent = useMutation({
    mutationFn: async (content: any) => {
      const { data, error } = await supabase
        .from("learning_path_content")
        .insert([content])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["path-content", pathId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateContent = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from("learning_path_content")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["path-content", pathId] });
    },
  });

  const removeContent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("learning_path_content")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["path-content", pathId] });
    },
  });

  const reorderContents = useMutation({
    mutationFn: async (contents: { id: string; order_index: number }[]) => {
      const updates = contents.map(({ id, order_index }) =>
        supabase
          .from("learning_path_content")
          .update({ order_index })
          .eq("id", id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["path-content", pathId] });
    },
  });

  return {
    contents,
    isLoading,
    addContent,
    updateContent,
    removeContent,
    reorderContents,
  };
};
