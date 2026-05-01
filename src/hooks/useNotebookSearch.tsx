import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SedefyResult = {
  id: string;
  title: string;
  description?: string | null;
  subject?: string | null;
  cover_url?: string | null;
  type: "video" | "reading" | "quiz" | "game" | "mindmap" | "path" | "course";
};

/**
 * Extracts a small set of search keywords from the notebook sources' titles
 * and (truncated) extracted text. Avoids stop words and too-short tokens.
 */
const STOPWORDS = new Set([
  "the","and","for","with","una","uno","las","los","del","por","que","con",
  "para","pero","como","este","esta","estos","estas","sobre","entre","cuando",
  "donde","más","sin","sus","sus","han","sido","ser","son","fue","era","eres",
  "tus","mis","sus","les","nos","nuestro","nuestra","ellos","ellas","ese","esa",
]);

const extractKeywords = (sources: any[], extra?: string): string[] => {
  const blob = [
    ...(sources || []).map((s) => `${s.title || ""} ${(s.extracted_text || "").slice(0, 800)}`),
    extra || "",
  ].join(" ").toLowerCase();
  const counts = new Map<string, number>();
  for (const raw of blob.split(/[^a-záéíóúüñ0-9]+/i)) {
    const t = raw.trim();
    if (t.length < 4) continue;
    if (STOPWORDS.has(t)) continue;
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k]) => k);
};

const buildOr = (terms: string[]) =>
  terms
    .map((t) => `title.ilike.%${t}%,description.ilike.%${t}%,subject.ilike.%${t}%`)
    .join(",");

/**
 * Direct (non-AI) Sedefy capsule search scoped to a notebook.
 * Returns a paginated list per type. Use offset to "load more".
 */
export const useNotebookSearch = (notebookId: string | undefined) => {
  const [loading, setLoading] = useState(false);

  const search = useCallback(
    async (
      type: "video" | "reading" | "quiz" | "game" | "mindmap" | "path" | "course",
      offset: number = 0,
      limit: number = 3
    ): Promise<SedefyResult[]> => {
      if (!notebookId) return [];
      setLoading(true);
      try {
        // Fetch sources for keyword extraction
        const { data: sources } = await supabase
          .from("notebook_sources")
          .select("title, extracted_text")
          .eq("notebook_id", notebookId)
          .eq("status", "ready");

        const keywords = extractKeywords(sources || []);
        const orFilter = keywords.length > 0 ? buildOr(keywords) : null;
        const range = { from: offset, to: offset + limit - 1 };

        // ---- content table (video / reading / mindmap) ----
        if (type === "video" || type === "reading" || type === "mindmap") {
          // mindmap is stored either in content table with category=mindmap
          // or via title fallback
          let q = supabase
            .from("content")
            .select("id, title, description, thumbnail_url, content_type, subject")
            .eq("is_public", true);

          if (type === "mindmap") {
            q = q.eq("content_type", "mapa_mental" as const);
          } else if (type === "reading") {
            q = q.eq("content_type", "lectura" as const);
          } else {
            q = q.eq("content_type", "video" as const);
          }
          if (orFilter) q = q.or(orFilter);

          const { data } = await q.range(range.from, range.to);
          return (data || []).map((c: any) => ({
            id: c.id,
            title: c.title,
            description: c.description,
            subject: c.subject,
            cover_url: c.thumbnail_url,
            type,
          }));
        }

        // ---- quizzes ----
        if (type === "quiz") {
          let q = supabase
            .from("quizzes")
            .select("id, title, description, thumbnail_url, subject")
            .eq("is_public", true);
          if (orFilter) q = q.or(orFilter);
          const { data } = await q.range(range.from, range.to);
          return (data || []).map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            subject: r.subject,
            cover_url: r.thumbnail_url,
            type: "quiz",
          }));
        }

        // ---- games ----
        if (type === "game") {
          let q = supabase
            .from("games")
            .select("id, title, description, thumbnail_url, subject")
            .eq("is_public", true);
          if (orFilter) q = q.or(orFilter);
          const { data } = await q.range(range.from, range.to);
          return (data || []).map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            subject: r.subject,
            cover_url: r.thumbnail_url,
            type: "game",
          }));
        }

        // ---- learning paths / courses ----
        if (type === "path" || type === "course") {
          let q = supabase
            .from("learning_paths")
            .select("id, title, description, cover_url, thumbnail_url, subject")
            .eq("is_public", true);
          if (orFilter) q = q.or(orFilter);
          const { data } = await q.range(range.from, range.to);
          return (data || []).map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            subject: r.subject,
            cover_url: r.cover_url || r.thumbnail_url,
            type,
          }));
        }

        return [];
      } finally {
        setLoading(false);
      }
    },
    [notebookId]
  );

  return { search, loading };
};
