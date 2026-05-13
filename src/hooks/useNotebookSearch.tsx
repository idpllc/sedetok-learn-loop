import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SedefyResult = {
  id: string;
  title: string;
  description?: string | null;
  subject?: string | null;
  cover_url?: string | null;
  type: "video" | "reading" | "quiz" | "game" | "mindmap" | "path" | "course";
  /** Subtype for readings: resumen | glosario | notas | otro */
  readingSubtype?: string | null;
  /** Relevance score (higher = better match) */
  score?: number;
};

export type ReadingSubtype = "resumen" | "glosario" | "notas" | "otro";

/**
 * AI-powered Sedefy capsule search scoped to a notebook.
 * Delegates topic extraction + reranking to the `notebook-ai-search` edge function
 * so results match the actual subject of the source instead of literal keywords.
 */
export const useNotebookSearch = (
  notebookId: string | undefined,
  sourceId: string | null = null
) => {
  const [loading, setLoading] = useState(false);

  const search = useCallback(
    async (
      type: "video" | "reading" | "quiz" | "game" | "mindmap" | "path" | "course",
      offset: number = 0,
      limit: number = 3,
      readingSubtype?: ReadingSubtype | null
    ): Promise<SedefyResult[]> => {
      if (!notebookId) return [];
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("notebook-ai-search", {
          body: { notebookId, sourceId, type, offset, limit, readingSubtype },
        });
        if (error) {
          console.error("notebook-ai-search error", error);
          return [];
        }
        return (data?.results || []) as SedefyResult[];
      } finally {
        setLoading(false);
      }
    },
    [notebookId, sourceId]
  );

  return { search, loading };
};
