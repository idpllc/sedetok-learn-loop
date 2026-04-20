import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSearchUsers = (searchQuery: string) => {
  return useQuery({
    queryKey: ["search-users", searchQuery],
    queryFn: async () => {
      const q = (searchQuery || "").trim();
      if (!q) return [];

      // Escape characters that have meaning in PostgREST or() filter values
      const safe = q.replace(/[,()*]/g, " ").trim();

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio, followers_count, numero_documento")
        .or(
          `username.ilike.%${safe}%,full_name.ilike.%${safe}%,numero_documento.ilike.%${safe}%`
        )
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!searchQuery && searchQuery.trim() !== "",
  });
};
