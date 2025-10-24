import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEducoins } from "@/hooks/useEducoins";

export const useCVVariations = (userId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { deductEducoins, showBuyModal, requiredAmount, closeBuyModal } = useEducoins();

  // Obtener todas las variaciones
  const { data: variations, isLoading } = useQuery({
    queryKey: ["cv-variations", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("cv_variations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Crear variación manual
  const createVariation = useMutation({
    mutationFn: async (variation: any) => {
      const { data, error } = await supabase
        .from("cv_variations")
        .insert({
          user_id: userId,
          ...variation,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cv-variations", userId] });
      toast({ title: "Variación creada exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al crear variación",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    },
  });

  // Generar variación con IA
  const generateWithAI = useMutation({
    mutationFn: async ({ profile, targetPosition, companyName, jobDescription }: any) => {
      // Deduct 20 educoins before generating
      const deductionSuccess = await deductEducoins(20, "Generación de CV con IA");
      if (!deductionSuccess) {
        throw new Error("No tienes suficientes educoins");
      }

      const { data, error } = await supabase.functions.invoke("generate-cv-variation", {
        body: { profile, targetPosition, companyName, jobDescription },
      });

      if (error) throw error;
      return data.variation;
    },
    onSuccess: () => {
      toast({ 
        title: "Variación generada con IA",
        description: "Revisa y ajusta los datos antes de guardar"
      });
    },
    onError: (error) => {
      toast({
        title: "Error al generar con IA",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    },
  });

  // Actualizar variación
  const updateVariation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from("cv_variations")
        .update({ ...updates, last_updated: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cv-variations", userId] });
      toast({ title: "Variación actualizada" });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    },
  });

  // Eliminar variación
  const deleteVariation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cv_variations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cv-variations", userId] });
      toast({ title: "Variación eliminada" });
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    },
  });

  // Marcar como favorita
  const toggleFavorite = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from("cv_variations")
        .update({ is_favorite: !isFavorite })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cv-variations", userId] });
    },
  });

  return {
    variations,
    isLoading,
    createVariation,
    generateWithAI,
    updateVariation,
    deleteVariation,
    toggleFavorite,
    showBuyModal,
    requiredAmount,
    closeBuyModal,
  };
};