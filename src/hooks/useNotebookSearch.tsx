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

type SearchSource = { id?: string; title?: string | null; extracted_text?: string | null; status?: string | null };

const notebookResultCache = new Map<string, SedefyResult[]>();

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
  // ES — pronombres, preposiciones, conjunciones, determinantes
  "para","pero","como","este","esta","estos","estas","sobre","entre","cuando",
  "donde","más","menos","sin","sus","han","sido","ser","son","fue","era","eres",
  "tus","mis","les","nos","nuestro","nuestra","ellos","ellas","ese","esa","eso",
  "del","las","los","una","unos","unas","con","por","que","qué",
  "ante","bajo","cabe","contra","desde","durante","hacia","hasta","mediante","según",
  "tras","versus","muy","tan","también","tambien","asi","así","aun","aún","ya",
  "porque","aunque","mientras","cada","todo","toda","todos","todas","otro","otra",
  "otros","otras","mismo","misma","cual","cuales","cuyo","cuya","aqui","aquí",
  "alli","allí","entonces","luego","despues","después","antes","ahora","hoy",
  "ayer","mañana","manana","siempre","nunca","jamas","jamás","quiza","quizá",
  // ES — verbos didácticos y comodín que aparecen en cualquier descripción educativa
  "explica","explicar","explican","explicacion","explicación","explicado","explicada",
  "explicando","explicadas","explicados","explicativa","explicativo",
  "tema","temas","video","videos","clase","clases","material","contenido","contenidos",
  "leccion","lección","lecciones","aprender","aprende","aprendes","aprendizaje",
  "estudiante","estudiantes","alumno","alumnos","profesor","profesora","maestro",
  "ejemplo","ejemplos","texto","textos","articulo","artículo","articulos","artículos",
  "concepto","conceptos","capitulo","capítulo","capitulos","capítulos",
  "principal","principales","general","generales","basico","básico","basica","básica",
  "introduccion","introducción","resumen","resumir","puntos","punto","clave","claves",
  "haciendo","énfasis","enfasis","tales","fundamentaban",
  "rasgos","proceso","procesos","elementos","contexto",
  // EN
  "the","and","for","with","that","this","from","have","has","had","not","but",
  "what","when","where","which","while","there","their","they","them","then",
  "into","upon","over","under","about","because","could","would","should",
  "your","yours","ours","mine","each","also","very","just","such","more","less",
  "some","most","both","other","others","same","than","only","being","been",
  "video","videos","lesson","topic","content","example","examples",
]);

type Keyword = { token: string; fromTitle: boolean; weight: number };

/**
 * Extract relevance-ranked keywords from notebook sources.
 * - Title tokens are TRUSTED keywords (must match for a result to be considered)
 * - extracted_text tokens are SUPPORTING keywords (boost score but cannot match alone)
 */
const extractKeywords = (sources: any[]): { titleKeywords: string[]; supportKeywords: string[] } => {
  const titleCounts = new Map<string, number>();
  const textCounts = new Map<string, number>();

  const tokenize = (text: string, target: Map<string, number>, weight: number) => {
    if (!text) return;
    for (const raw of norm(text).split(/[^a-z0-9ñ]+/i)) {
      const t = raw.trim();
      if (t.length < 5) continue;
      if (STOPWORDS.has(t)) continue;
      if (/^\d+$/.test(t)) continue;
      target.set(t, (target.get(t) || 0) + weight);
    }
  };

  for (const s of sources || []) {
    // Both the source title AND its content/competency text describe the topic
    // the user wants to study. Treat both as primary keywords so we don't miss
    // results when the user puts the subject in the title and the actual topic
    // in the content (e.g. title="Matemáticas", content="Teorema de Pitágoras").
    tokenize(s.title || "", titleCounts, 5);
    tokenize((s.extracted_text || "").slice(0, 1200), titleCounts, 3);
  }

  const titleKeywords = [...titleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => k);

  // Support keywords intentionally empty now — every meaningful term from the
  // source is a primary keyword. We keep the field for backwards compatibility.
  const supportKeywords: string[] = [];

  return { titleKeywords, supportKeywords };
};

/**
 * Scores a row given title-derived and support keywords.
 * Hard requirement: a row MUST contain at least one TITLE keyword in its
 * title or description; otherwise the score is 0 and it is rejected.
 */
const scoreRow = (
  row: any,
  titleKeywords: string[],
  supportKeywords: string[]
): number => {
  const title = norm(row.title || "");
  const desc = norm(row.description || "");
  const subject = norm(row.subject || "");

  let titleHits = 0;
  let score = 0;

  for (const k of titleKeywords) {
    if (!k) continue;
    if (title.includes(k)) {
      score += 10;
      titleHits++;
    } else if (desc.includes(k)) {
      score += 4;
      titleHits++;
    } else if (subject.includes(k)) {
      score += 3;
      titleHits++;
    }
  }

  // Hard gate: at least ONE title keyword must hit somewhere.
  if (titleHits === 0) return 0;

  for (const k of supportKeywords) {
    if (!k) continue;
    if (title.includes(k)) score += 2;
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
  sourceId: string | null = null,
  sourceRows?: SearchSource[]
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
        // Reuse the already-loaded notebook source rows whenever possible.
        // This avoids a second heavy notebook_sources query for every capsule type.
        let sources = sourceRows
          ?.filter((s) => s.status === "ready")
          .filter((s) => !sourceId || s.id === sourceId);

        if (!sources) {
          let srcQuery = supabase
            .from("notebook_sources")
            .select("id, title, extracted_text, status")
            .eq("notebook_id", notebookId)
            .eq("status", "ready");
          if (sourceId) srcQuery = srcQuery.eq("id", sourceId);
          const { data } = await srcQuery;
          sources = data || [];
        }

        const { titleKeywords, supportKeywords } = extractKeywords(sources || []);

        // If we couldn't extract any TITLE keywords, refuse to return any
        // results — better to show nothing than off-topic content.
        if (titleKeywords.length === 0) {
          return [];
        }

        const keywordKey = titleKeywords.join("|");
        const cacheKey = [notebookId, sourceId || "all", type, readingSubtype || "", offset, limit, keywordKey].join("::");
        const cached = notebookResultCache.get(cacheKey);
        if (cached) return cached;

        // The DB pre-filter only uses TITLE keywords, so we never even fetch
        // rows that lack at least one strong topical match.
        const orFilter = buildOr(titleKeywords);

        // Fetch a wider window than requested so we can rank locally.
        const fetchLimit = Math.max(12, (offset + limit) * 3);

        // Require a strong total score so a single weak match is not enough.
        const MIN_SCORE = 10;
        const rank = (rows: any[]) =>
          rows
            .map((r) => ({ row: r, score: scoreRow(r, titleKeywords, supportKeywords) }))
            .filter((x) => x.score >= MIN_SCORE)
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

          const { data } = await q.order("created_at", { ascending: false }).limit(fetchLimit);
          const results = rank(data || []).map(({ row: c, score }) => ({
            id: c.id,
            title: c.title,
            description: c.description,
            subject: c.subject,
            cover_url: c.thumbnail_url,
            type,
            readingSubtype: c.reading_type,
            score,
          }));
          notebookResultCache.set(cacheKey, results);
          return results;
        }

        // ---- quizzes ----
        if (type === "quiz") {
          let q = supabase
            .from("quizzes")
            .select("id, title, description, thumbnail_url, subject")
            .eq("is_public", true);
          if (orFilter) q = q.or(orFilter);
          const { data } = await q.order("created_at", { ascending: false }).limit(fetchLimit);
          const results = rank(data || []).map(({ row: r, score }) => ({
            id: r.id, title: r.title, description: r.description, subject: r.subject,
            cover_url: r.thumbnail_url, type: "quiz", score,
          }));
          notebookResultCache.set(cacheKey, results);
          return results;
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
