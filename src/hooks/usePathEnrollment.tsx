import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const usePathEnrollment = (pathId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: enrollment, isLoading } = useQuery({
    queryKey: ["path-enrollment", pathId, user?.id],
    queryFn: async () => {
      if (!pathId || !user) return null;
      const { data, error } = await supabase
        .from("path_enrollments")
        .select("*")
        .eq("user_id", user.id)
        .eq("path_id", pathId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!pathId && !!user,
  });

  const enroll = useMutation({
    mutationFn: async () => {
      if (!user || !pathId) throw new Error("No autenticado");
      const { data, error } = await supabase
        .from("path_enrollments")
        .insert({ user_id: user.id, path_id: pathId })
        .select()
        .maybeSingle();

      // Treat duplicate enrollment as success (idempotent)
      if (error) {
        const code = (error as any).code;
        const msg = (error as any).message || "";
        const isDuplicate =
          code === "23505" || /duplicate key|already exists|unique constraint/i.test(msg);
        if (!isDuplicate) {
          console.error("[path-enrollment] enroll failed:", error);
          throw error;
        }
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["path-enrollment", pathId, user?.id] });
      toast.success("¡Listo! Buena suerte 🚀");
    },
    onError: (err: any) => {
      console.error("[path-enrollment] mutation error:", err);
      toast.error(err?.message ? `No se pudo iniciar: ${err.message}` : "No se pudo iniciar");
    },
  });

  return {
    isEnrolled: !!enrollment,
    enrollment,
    isLoading,
    enroll,
  };
};
