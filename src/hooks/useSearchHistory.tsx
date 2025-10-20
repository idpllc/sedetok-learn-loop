import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface SearchHistoryItem {
  id: string;
  query: string;
  created_at: string;
}

export const useSearchHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("search_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching search history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const addSearch = async (query: string) => {
    if (!user || !query.trim()) return;

    try {
      // Check if query already exists
      const { data: existing } = await supabase
        .from("search_history")
        .select("id")
        .eq("query", query.trim())
        .maybeSingle();

      if (existing) {
        // Delete old entry to add new one (to update timestamp)
        await supabase.from("search_history").delete().eq("id", existing.id);
      }

      const { error } = await supabase
        .from("search_history")
        .insert([{ query: query.trim(), user_id: user.id }]);

      if (error) throw error;
      await fetchHistory();
    } catch (error) {
      console.error("Error adding search:", error);
    }
  };

  const deleteSearch = async (id: string) => {
    try {
      const { error } = await supabase
        .from("search_history")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setHistory(history.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error deleting search:", error);
    }
  };

  const clearHistory = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("search_history")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;
      setHistory([]);
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

  return {
    history,
    loading,
    addSearch,
    deleteSearch,
    clearHistory,
  };
};
