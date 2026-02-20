import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

// --- SessionStorage helpers ---
const INSTITUTION_CACHE_KEY = (userId: string) => `institution_profile_${userId}`;
const MEMBERSHIP_CACHE_KEY = (userId: string) => `institution_membership_${userId}`;

function readCache<T>(key: string): T | undefined {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function writeCache(key: string, value: unknown) {
  try {
    if (value === null || value === undefined) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // sessionStorage puede fallar en modo privado con cuota llena — ignorar
  }
}

export const useInstitution = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's institution (admin) or by membership as fallback
  const { data: myInstitution, isLoading: institutionLoading } = useQuery({
    queryKey: ["my-institution", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const sb = supabase as any;

      // First: institution where user is admin
      const { data: instAdmin, error: errAdmin } = await sb
        .from("institutions")
        .select("*")
        .eq("admin_user_id", user.id)
        .maybeSingle();

      if (errAdmin && errAdmin.code !== "PGRST116") {
        console.error("Error fetching institution (admin):", errAdmin);
        throw errAdmin;
      }
      if (instAdmin) {
        writeCache(INSTITUTION_CACHE_KEY(user.id), instAdmin);
        return instAdmin;
      }

      // Fallback: institution where user is member
      const { data: membership, error: errMember } = await sb
        .from("institution_members")
        .select(`
          institution:institutions(*)
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (errMember && errMember.code !== "PGRST116") {
        console.error("Error fetching institution (member):", errMember);
        throw errMember;
      }

      const result = membership?.institution ?? null;
      writeCache(INSTITUTION_CACHE_KEY(user.id), result);
      return result;
    },
    enabled: !!user,
    // Datos frescos por 5 min; mientras tanto usa caché de sessionStorage
    staleTime: 5 * 60 * 1000,
    // Datos pre-cargados desde sessionStorage — aparecen INMEDIATAMENTE sin skeleton
    initialData: user ? readCache(INSTITUTION_CACHE_KEY(user.id)) : undefined,
    initialDataUpdatedAt: 0, // Marca como stale para re-validar en background
    refetchOnMount: true,
    refetchOnWindowFocus: false,
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
      writeCache(MEMBERSHIP_CACHE_KEY(user.id), data);
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    initialData: user ? readCache(MEMBERSHIP_CACHE_KEY(user.id)) : undefined,
    initialDataUpdatedAt: 0,
    refetchOnWindowFocus: false,
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
    queryClient.invalidateQueries({ queryKey: ["institution-members", myInstitution?.id] });
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
    queryClient.invalidateQueries({ queryKey: ["institution-members", myInstitution?.id] });
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
