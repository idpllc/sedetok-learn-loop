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
 * Spanish + English stopwords for keyword extraction.
 */
/** Strip diacritics for accent-insensitive matching */
const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const STOPWORDS = new Set([
  // ES
  "para","pero","como","este","esta","estos","estas","sobre","entre","cuando",
  "donde","más","menos","sin","sus","sus","han","sido","ser","son","fue","era","eres",
  "tus","mis","les","nos","nuestro","nuestra","ellos","ellas","ese","esa","eso",
  "del","las","los","una","unos","unas","con","por","que","qué","los","las",
  "ante","bajo","cabe","contra","desde","durante","hacia","hasta","mediante","según",
  "tras","versus","muy","tan","también","tambien","asi","así","aun","aún","ya",
  "porque","aunque","mientras","cada","todo","toda","todos","todas","otro","otra",
  "otros","otras","mismo","misma","cual","cuales","cuyo","cuya","aqui","aquí",
  "alli","allí","entonces","luego","despues","después","antes","ahora","hoy",
  "ayer","mañana","manana","siempre","nunca","jamas","jamás","quiza","quizá",
  // EN
  "the","and","for","with","that","this","from","have","has","had","not","but",
  "what","when","where","which","while","there","their","they","them","then",
  "into","upon","over","under","about","because","because","could","would","should",
  "your","yours","ours","mine","each","also","very","just","such","more","less",
  "some","most","both","other","others","same","than","then","only","being","been",
]);

/**
 * Extract relevance-ranked keywords from notebook sources.
 * - Heavily weights TITLE tokens (x4)
 * - Truncates extracted_text to first 600 chars per source (intro is most relevant)
 * - Returns top 8 unique tokens by weighted count
 */
const extractKeywords = (sources: any[]): string[] => {
  const counts = new Map<string, number>();

  const addTokens = (text: string, weight: number) => {
    if (!text) return;
    for (const raw of norm(text).split(/[^a-z0-9ñ]+/i)) {
      const t = raw.trim();
      if (t.length < 5) continue; // require longer tokens for precision
      if (STOPWORDS.has(t)) continue;
      if (/^\d+$/.test(t)) continue;
      counts.set(t, (counts.get(t) || 0) + weight);
    }
  };

  for (const s of sources || []) {
    addTokens(s.title || "", 5);
    addTokens((s.extracted_text || "").slice(0, 1200), 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);
};

/** Scores how relevant a row is given the keywords (higher = better). */
const scoreRow = (row: any, keywords: string[]): number => {
  const title = norm(row.title || "");
  const desc = norm(row.description || "");
  let score = 0;
  for (const k of keywords) {
    if (!k) continue;
    if (title.includes(k)) score += 5;
    else if (desc.includes(k)) score += 1;
  }
  return score;
};

const buildOr = (terms: string[]) =>
  terms
    .map((t) => `title.ilike.%${t}%,description.ilike.%${t}%`)
    .join(",");

/**
 * Direct (non-AI) Sedefy capsule search scoped to a notebook.
 * Fetches a wider window from the DB then re-ranks/filters locally for precision.
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
        // Fetch sources for keyword extraction. If a specific source is
        // selected, restrict keyword extraction to that source so each
        // source has its own scoped Studio results.
        let srcQuery = supabase
          .from("notebook_sources")
          .select("title, extracted_text")
          .eq("notebook_id", notebookId)
          .eq("status", "ready");
        if (sourceId) srcQuery = srcQuery.eq("id", sourceId);
        const { data: sources } = await srcQuery;

        const keywords = extractKeywords(sources || []);
        const orFilter = keywords.length > 0 ? buildOr(keywords) : null;

        // Fetch a wider window than requested so we can rank locally.
        // Window grows with offset to support "Buscar más" pagination after re-ranking.
        const fetchLimit = Math.max(20, (offset + limit) * 4);

        // Require a strong match: a title hit (>=5) OR at least 2 keyword hits in description.
        // This prevents off-topic results when only weak/incidental tokens overlap.
        const MIN_SCORE = 5;
        const rank = (rows: any[]) =>
          rows
            .map((r) => ({ row: r, score: scoreRow(r, keywords) }))
            .filter((x) => keywords.length === 0 ? false : x.score >= MIN_SCORE)
            .sort((a, b) => b.score - a.score)
            .slice(offset, offset + limit);

        // ---- content table (video / reading / mindmap) ----
        if (type === "video" || type === "reading" || type === "mindmap") {
          let q = supabase
            .from("content")
            .select("id, title, description, thumbnail_url, content_type, subject, reading_type")
            .eq("is_public", true);

          if (type === "mindmap") {
            q = q.eq("content_type", "mapa_mental" as const);
          } else if (type === "reading") {
            q = q.eq("content_type", "lectura" as const);
            if (readingSubtype && readingSubtype !== "otro") {
              q = q.eq("reading_type", readingSubtype);
            } else if (readingSubtype === "otro") {
              // Anything that is NOT one of the known subtypes (or null)
              q = q.or("reading_type.is.null,and(reading_type.neq.resumen,reading_type.neq.glosario,reading_type.neq.notas)");
            }
          } else {
            q = q.eq("content_type", "video" as const);
          }
          if (orFilter) q = q.or(orFilter);

          const { data } = await q.limit(fetchLimit);
          return rank(data || []).map(({ row: c, score }) => ({
            id: c.id,
            title: c.title,
            description: c.description,
            subject: c.subject,
            cover_url: c.thumbnail_url,
            type,
            readingSubtype: c.reading_type,
            score,
          }));
        }

        // ---- quizzes ----
        if (type === "quiz") {
          let q = supabase
            .from("quizzes")
            .select("id, title, description, thumbnail_url, subject")
            .eq("is_public", true);
          if (orFilter) q = q.or(orFilter);
          const { data } = await q.limit(fetchLimit);
          return rank(data || []).map(({ row: r, score }) => ({
            id: r.id, title: r.title, description: r.description, subject: r.subject,
            cover_url: r.thumbnail_url, type: "quiz", score,
          }));
        }

        // ---- games ----
        if (type === "game") {
          let q = supabase
            .from("games")
            .select("id, title, description, thumbnail_url, subject")
            .eq("is_public", true);
          if (orFilter) q = q.or(orFilter);
          const { data } = await q.limit(fetchLimit);
          return rank(data || []).map(({ row: r, score }) => ({
            id: r.id, title: r.title, description: r.description, subject: r.subject,
            cover_url: r.thumbnail_url, type: "game", score,
          }));
        }

        // ---- learning paths / courses ----
        if (type === "path" || type === "course") {
          let q = supabase
            .from("learning_paths")
            .select("id, title, description, cover_url, thumbnail_url, subject")
            .eq("is_public", true);
          if (orFilter) q = q.or(orFilter);
          const { data } = await q.limit(fetchLimit);
          return rank(data || []).map(({ row: r, score }) => ({
            id: r.id, title: r.title, description: r.description, subject: r.subject,
            cover_url: r.cover_url || r.thumbnail_url, type, score,
          }));
        }

        return [];
      } finally {
        setLoading(false);
      }
    },
    [notebookId, sourceId]
  );

  return { search, loading };
};
