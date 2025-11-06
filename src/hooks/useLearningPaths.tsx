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
          .select(`
            *,
            profiles:creator_id(username, avatar_url, full_name)
          `)
          .eq("is_public", true)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        return (data || []) as any[];
      }

      if (filter === 'created') {
        // Only paths created by the user
        const { data, error } = await supabase
          .from("learning_paths")
          .select(`
            *,
            profiles:creator_id(username, avatar_url, full_name)
          `)
          .eq("creator_id", userId)
          .order("created_at", { ascending: false});
        
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
          .select(`
            *,
            profiles:creator_id(username, avatar_url, full_name)
          `)
          .in("id", pathIds)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        return (data || []) as any[];
      } else {
        // All public paths + own (including drafts) when logged in
        let query = supabase
          .from("learning_paths")
          .select(`
            *,
            profiles:creator_id(username, avatar_url, full_name)
          `)
          .order("created_at", { ascending: false });
        if (userId) {
          // Show public paths or those created by the current user
          query = query.or(`is_public.eq.true,creator_id.eq.${userId}`);
        } else {
          query = query.eq("is_public", true);
        }
        const { data, error } = await query;
        
        if (error) throw error;
        return (data || []) as any[];
      }
    },
  }) as { data: any[] | undefined; isLoading: boolean };

  const createPath = useMutation({
    mutationFn: async (path: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      console.log("Creating path with user:", user.id);

      const { data, error } = await supabase
        .from("learning_paths")
        .insert([{ 
          ...path, 
          creator_id: user.id,
          status: path.status || 'draft'
        }])
        .select()
        .single();

      if (error) {
        console.error("Error creating path:", error);
        throw error;
      }
      
      console.log("Path created successfully:", data);
      return data;
    },
    onSuccess: async (data) => {
      // Invalidar todas las queries de learning-paths para forzar refetch
      queryClient.invalidateQueries({ queryKey: ["learning-paths"] });
      // También invalidar queries específicas del usuario
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["learning-paths", userId] });
        queryClient.invalidateQueries({ queryKey: ["learning-paths", userId, "created"] });
      }
      console.log("Queries invalidated after creating path:", data.id);
      
      // Award 3000 XP for creating a learning path
      if (data.creator_id) {
        await supabase.rpc('award_xp_for_path_creation', {
          p_user_id: data.creator_id,
          p_path_id: data.id
        });
      }
      
      toast({
        title: "¡Ruta creada!",
        description: "La ruta de aprendizaje ha sido creada exitosamente. ¡+3000 XP!",
      });
    },
    onError: (error: Error) => {
      console.error("Create path error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePath = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      console.log("Updating path:", id, "by user:", user.id);

      // Verificar que el usuario sea el creador
      const { data: path, error: fetchError } = await supabase
        .from("learning_paths")
        .select("creator_id")
        .eq("id", id)
        .single();

      if (fetchError) {
        console.error("Error fetching path for update:", fetchError);
        throw fetchError;
      }
      
      console.log("Path creator_id:", path.creator_id, "User id:", user.id);
      
      if (path.creator_id !== user.id) {
        throw new Error("Solo el creador puede actualizar esta ruta");
      }

      const { data, error } = await supabase
        .from("learning_paths")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating path:", error);
        throw error;
      }
      
      console.log("Path updated successfully:", data);
      return data;
    },
    onSuccess: () => {
      // Invalidar todas las queries de learning-paths
      queryClient.invalidateQueries({ queryKey: ["learning-paths"] });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["learning-paths", userId] });
        queryClient.invalidateQueries({ queryKey: ["learning-paths", userId, "created"] });
      }
      toast({
        title: "Ruta actualizada",
        description: "La ruta ha sido actualizada exitosamente",
      });
    },
    onError: (error: Error) => {
      console.error("Update path error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePath = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Verificar que el usuario sea el creador
      const { data: path, error: fetchError } = await supabase
        .from("learning_paths")
        .select("creator_id")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      if (path.creator_id !== user.id) throw new Error("Solo el creador puede eliminar esta ruta");

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

  const clonePath = useMutation({
    mutationFn: async (sourcePathId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Get source path
      const { data: sourcePath, error: pathError } = await supabase
        .from("learning_paths")
        .select("*")
        .eq("id", sourcePathId)
        .single();

      if (pathError) throw pathError;

      // Get source path content
      const { data: sourceContent, error: contentError } = await supabase
        .from("learning_path_content")
        .select("*")
        .eq("path_id", sourcePathId);

      if (contentError) throw contentError;

      // Create new path (without id and creator_id)
      const { id: _, creator_id: __, created_at, updated_at, ...pathData } = sourcePath;
      const { data: newPath, error: newPathError } = await supabase
        .from("learning_paths")
        .insert([{ 
          ...pathData, 
          creator_id: user.id,
          title: `${pathData.title} (Copia)`,
          status: 'draft'
        }])
        .select()
        .single();

      if (newPathError) throw newPathError;

      // Clone content
      if (sourceContent && sourceContent.length > 0) {
        const contentToInsert = sourceContent.map(item => {
          const { id, path_id, created_at, ...itemData } = item;
          return { ...itemData, path_id: newPath.id };
        });

        const { error: insertError } = await supabase
          .from("learning_path_content")
          .insert(contentToInsert);

        if (insertError) throw insertError;
      }

      return newPath;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-paths"] });
      toast({
        title: "Ruta clonada",
        description: "La ruta ha sido clonada exitosamente",
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
    clonePath,
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
          quiz:quizzes(*),
          game:games(*)
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
        .maybeSingle();

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
        .maybeSingle();

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
