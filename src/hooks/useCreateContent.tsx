import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { useXP } from "@/hooks/useXP";

type CategoryType = Database["public"]["Enums"]["category_type"];
type ContentType = Database["public"]["Enums"]["content_type"];
type GradeLevel = Database["public"]["Enums"]["grade_level"];

interface CreateContentData {
  title: string;
  description?: string;
  category: CategoryType;
  subject?: string;
  grade_level: GradeLevel;
  content_type: ContentType;
  tags?: string[];
  video_url?: string;
  document_url?: string;
  thumbnail_url?: string;
  rich_text?: string | null;
}

export const useCreateContent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { awardXP } = useXP();

  const createMutation = useMutation({
    mutationFn: async (data: CreateContentData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data: content, error } = await supabase
        .from("content")
        .insert([{
          ...data,
          creator_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return content;
    },
    onSuccess: async (content) => {
      queryClient.invalidateQueries({ queryKey: ["content"] });
      
      // Award 1000 XP for uploading content
      await supabase.rpc('award_xp_for_upload', {
        p_user_id: content.creator_id,
        p_content_id: content.id
      });
      
      toast({
        title: "¡Cápsula creada!",
        description: "Tu contenido ha sido publicado exitosamente. ¡+1000 XP!",
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

  return { createMutation };
};
