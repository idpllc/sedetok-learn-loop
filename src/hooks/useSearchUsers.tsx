import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSearchUsers = (searchQuery: string) => {
  return useQuery({
    queryKey: ["search-users", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.trim() === "") {
        return [];
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio, followers_count")
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!searchQuery && searchQuery.trim() !== "",
  });
};
