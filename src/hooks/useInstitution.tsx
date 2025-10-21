import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export const useInstitution = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's institution (if they're an admin)
  const { data: myInstitution, isLoading: institutionLoading } = useQuery({
    queryKey: ["my-institution", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const sb = supabase as any;
      const { data, error } = await sb
        .from("institutions")
        .select("*")
        .eq("admin_user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching institution:", error);
        throw error;
      }
      
      console.log("Institution data fetched:", data); // Debug log
      return data;
    },
    enabled: !!user,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Get user's institution membership
  const { data: myMembership, isLoading: membershipLoading } = useQuery({
    queryKey: ["my-membership", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const sb = supabase as any;
      const { data, error } = await sb
        .from("institution_members")
        .select(`
          *,
          institution:institutions(*)
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user
  });

  // Get institution members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["institution-members", myInstitution?.id],
    queryFn: async () => {
      if (!myInstitution) return [];

      const sb = supabase as any;
      const { data, error } = await sb
        .from("institution_members")
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq("institution_id", myInstitution.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!myInstitution
  });

  // Add member mutation
  const addMember = useMutation({
    mutationFn: async ({ userId, memberRole }: { userId: string; memberRole: string }) => {
      if (!myInstitution) throw new Error("No institution found");

      const sb = supabase as any;
      const { data, error } = await sb
        .from("institution_members")
        .insert({
          institution_id: myInstitution.id,
          user_id: userId,
          member_role: memberRole,
          invited_by: user?.id,
          status: "active"
        })
        .select()
        .single();

      if (error) throw error;

      // Note: member_role (student, teacher, parent) is stored in institution_members table
      // It does NOT create an entry in user_roles - all users keep their "user" role globally
      // Only institution admins get "institution" role in user_roles

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["institution-members"] });
      toast({
        title: "Miembro agregado",
        description: "El usuario ha sido vinculado a la institución"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar el miembro",
        variant: "destructive"
      });
    }
  });

  // Remove member mutation
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const sb = supabase as any;
      const { error } = await sb
        .from("institution_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["institution-members"] });
      toast({
        title: "Miembro removido",
        description: "El usuario ha sido desvinculado de la institución"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo remover el miembro",
        variant: "destructive"
      });
    }
  });

  return {
    myInstitution: myInstitution as any,
    myMembership: myMembership as any,
    members: (members as any[]),
    isLoading: institutionLoading || membershipLoading || membersLoading,
    addMember,
    removeMember
  };
};
