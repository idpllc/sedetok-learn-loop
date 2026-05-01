import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotebooks, useNotebookSources } from "@/hooks/useNotebooks";
import { useNotebookChat } from "@/hooks/useNotebookChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ArrowLeft, Plus, Send, Loader2, FileText, Type, Link as LinkIcon, Video, GraduationCap,
  Trash2, Sparkles, BookOpen, Map, Brain, Gamepad2, FileQuestion, Book, Pencil, Wand2, ExternalLink,
  Maximize2, Minimize2, ChevronLeft, Check
} from "lucide-react";
import { AddSourceDialog } from "@/components/notebook/AddSourceDialog";
import { CapsuleProgressCard } from "@/components/notebook/CapsuleProgressCard";
import { NotebookTutorial, NotebookTutorialHelpButton } from "@/components/notebook/NotebookTutorial";
import ReactMarkdown from "react-markdown";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useNotebookSearch, type SedefyResult, type ReadingSubtype } from "@/hooks/useNotebookSearch";
import { X, FileSearch, NotebookPen, Library } from "lucide-react";

const TYPE_ICONS: Record<string, any> = {
  pdf: FileText, docx: FileText, xlsx: FileText, text: Type, url: LinkIcon, video: Video, competence: GraduationCap,
};

type StudioOption = {
  id: string;
  label: string;
  icon: any;
  /** Tailwind classes for the button color theme */
  color: string;
  /** Optional reading subtype to scope the search */
  readingSubtype?: ReadingSubtype;
  /** Content type filter for SEDEFY library search */
  searchType: "video" | "reading" | "quiz" | "game" | "mindmap" | "path" | "course";
  /** Route to AI-powered creator. null => no AI creator (e.g., video). */
  createRoute: string | null;
  /** Prompt (legacy, unused after local search refactor) */
  prompt: string;
};

const STUDIO_OPTIONS: StudioOption[] = [
  {
    id: "video",
    label: "Video",
    icon: Video,
    color: "from-rose-500/15 to-rose-500/5 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400",
    searchType: "video",
    createRoute: null,
    prompt: "",
  },
  {
    id: "reading-resumen",
    label: "Resúmenes",
    icon: FileSearch,
    color: "from-amber-500/15 to-amber-500/5 border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400",
    searchType: "reading",
    readingSubtype: "resumen",
    createRoute: "/create?type=reading&reading_type=resumen",
    prompt: "",
  },
  {
    id: "reading-glosario",
    label: "Glosarios",
    icon: Book,
    color: "from-orange-500/15 to-orange-500/5 border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:text-orange-400",
    searchType: "reading",
    readingSubtype: "glosario",
    createRoute: "/create?type=reading&reading_type=glosario",
    prompt: "",
  },
  {
    id: "reading-notas",
    label: "Notas",
    icon: NotebookPen,
    color: "from-yellow-500/15 to-yellow-500/5 border-yellow-500/30 text-yellow-700 hover:bg-yellow-500/10 dark:text-yellow-400",
    searchType: "reading",
    readingSubtype: "notas",
    createRoute: "/create?type=reading&reading_type=notas",
    prompt: "",
  },
  {
    id: "reading-otro",
    label: "Libros / Artículos",
    icon: Library,
    color: "from-stone-500/15 to-stone-500/5 border-stone-500/30 text-stone-700 hover:bg-stone-500/10 dark:text-stone-400",
    searchType: "reading",
    readingSubtype: "otro",
    createRoute: "/create?type=reading",
    prompt: "",
  },
  {
    id: "mindmap",
    label: "Mapa mental",
    icon: Brain,
    color: "from-fuchsia-500/15 to-fuchsia-500/5 border-fuchsia-500/30 text-fuchsia-600 hover:bg-fuchsia-500/10 dark:text-fuchsia-400",
    searchType: "mindmap",
    createRoute: "/create?type=mindmap",
    prompt: "",
  },
  {
    id: "quiz",
    label: "Quiz",
    icon: FileQuestion,
    color: "from-sky-500/15 to-sky-500/5 border-sky-500/30 text-sky-600 hover:bg-sky-500/10 dark:text-sky-400",
    searchType: "quiz",
    createRoute: "/create?type=quiz",
    prompt: "",
  },
  {
    id: "game",
    label: "Juego",
    icon: Gamepad2,
    color: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400",
    searchType: "game",
    createRoute: "/create?type=game",
    prompt: "",
  },
  {
    id: "path",
    label: "Ruta",
    icon: Map,
    color: "from-violet-500/15 to-violet-500/5 border-violet-500/30 text-violet-600 hover:bg-violet-500/10 dark:text-violet-400",
    searchType: "path",
    createRoute: "/learning-paths/create",
    prompt: "",
  },
  {
    id: "course",
    label: "Curso",
    icon: BookOpen,
    color: "from-indigo-500/15 to-indigo-500/5 border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-400",
    searchType: "course",
    createRoute: "/courses/create",
    prompt: "",
  },
];

const STUDIO_BY_ID: Record<string, StudioOption> = STUDIO_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.id]: o }),
  {}
);

const ctaLabel = (opt: StudioOption) => {
  if (opt.id === "video") return "Subir un video";
  return `✨ Crear ${opt.label.toLowerCase()} con IA`;
};

// ----- Sub-components -----

const ContentPreviewCards = ({ content }: { content: any[] }) => {
  // Build a playlist of items of the same type so SedeTok navigation only
  // moves through the search results (no random related content).
  const buildPlaylist = (currentItem: any) => {
    const sameType = content.filter((c) => c.type === currentItem.type);
    return sameType.map((c) => `${c.id}:${c.type}`).join(",");
  };
  const route = (item: any) => {
    const playlist = encodeURIComponent(buildPlaylist(item));
    const param = item.type === "quiz" ? "quiz" : item.type === "game" ? "game" : "content";
    if (item.type === "path" || item.type === "course") return `/learning-paths/view/${item.id}`;
    return `/sedetok?${param}=${item.id}&playlist=${playlist}`;
  };
  const typeLabel: Record<string, string> = {
    video: "📹 Video", quiz: "📝 Quiz", game: "🎮 Juego", reading: "📖 Lectura", mindmap: "🧠 Mapa", path: "🗺️ Ruta",
  };
  return (
    <div className="mt-3 w-full">
      <Carousel opts={{ align: "start", loop: false }} className="w-full">
        <CarouselContent className="-ml-2">
          {content.map((item) => (
            <CarouselItem key={item.id} className="pl-2 basis-[200px]">
              <Card
                className="cursor-pointer hover:shadow-md transition overflow-hidden h-full border-border/50"
                onClick={() => window.open(route(item), "_blank")}
              >
                <div className="aspect-video w-full overflow-hidden bg-muted relative">
                  {item.cover_url ? (
                    <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" width={200} height={112} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/20">
                      <span className="text-2xl">{(typeLabel[item.type] || "📄").split(" ")[0]}</span>
                    </div>
                  )}
                  <span className="absolute top-1.5 left-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-background/90 backdrop-blur">
                    {typeLabel[item.type] || item.type}
                  </span>
                </div>
                <div className="p-2">
                  <h3 className="font-semibold text-xs line-clamp-2 leading-tight">{item.title}</h3>
                  {item.subject && <span className="text-[10px] text-muted-foreground">{item.subject}</span>}
                </div>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </div>
  );
};

const PathPreviewCards = ({ paths }: { paths: any[] }) => (
  <div className="mt-3 w-full">
    <Carousel opts={{ align: "start", loop: false }} className="w-full">
      <CarouselContent className="-ml-2">
        {paths.map((p) => (
          <CarouselItem key={p.id} className="pl-2 basis-[200px]">
            <Card
              className="cursor-pointer hover:shadow-md transition overflow-hidden h-full border-primary/20"
              onClick={() => window.open(`/learning-paths/view/${p.id}`, "_blank")}
            >
              <div className="aspect-video w-full overflow-hidden bg-muted relative">
                {p.cover_url ? (
                  <img src={p.cover_url} alt={p.title} className="w-full h-full object-cover" loading="lazy" width={200} height={112} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/30">
                    <span className="text-2xl">🗺️</span>
                  </div>
                )}
                <span className="absolute top-1.5 left-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  🗺️ Ruta
                </span>
              </div>
              <div className="p-2">
                <h3 className="font-semibold text-xs line-clamp-2 leading-tight">{p.title}</h3>
                {p.subject && <span className="text-[10px] text-muted-foreground">{p.subject}</span>}
              </div>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden sm:flex" />
      <CarouselNext className="hidden sm:flex" />
    </Carousel>
  </div>
);

/** Parse special markers from assistant content. */
const parseAssistantContent = (raw: string) => {
  let content = raw;
  let paths: any[] | null = null;
  let contentItems: any[] | null = null;
  let studioCta: { type: string } | null = null;
  let generating: { type: string } | null = null;

  const pathsMatch = content.match(/\|\|\|PATHS_DATA:(.*?)\|\|\|/);
  if (pathsMatch) {
    try { paths = JSON.parse(pathsMatch[1]); } catch {}
    content = content.replace(/\|\|\|PATHS_DATA:.*?\|\|\|/, "").trim();
  }
  const contentMatch = content.match(/\|\|\|CONTENT_DATA:(.*?)\|\|\|/);
  if (contentMatch) {
    try { contentItems = JSON.parse(contentMatch[1]); } catch {}
    content = content.replace(/\|\|\|CONTENT_DATA:.*?\|\|\|/, "").trim();
  }
  const ctaMatch = content.match(/\|\|\|STUDIO_CTA:(.*?)\|\|\|/);
  if (ctaMatch) {
    try { studioCta = JSON.parse(ctaMatch[1]); } catch {}
    content = content.replace(/\|\|\|STUDIO_CTA:.*?\|\|\|/, "").trim();
  }
  const genMatch = content.match(/\|\|\|GENERATING:(.*?)\|\|\|/);
  if (genMatch) {
    try { generating = JSON.parse(genMatch[1]); } catch {}
    content = content.replace(/\|\|\|GENERATING:.*?\|\|\|/, "").trim();
  }
  return { content, paths, contentItems, studioCta, generating };
};

// ----- Main page -----

const NotebookView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { rename } = useNotebooks();
  const sources = useNotebookSources(id);

  // Active source: when set, chat + studio are scoped to that single source.
  // null = "todas las fuentes" (default behaviour). Persisted per-notebook.
  const activeSourceKey = id ? `notebook:activeSource:${id}` : null;
  const [activeSourceId, setActiveSourceIdState] = useState<string | null>(() => {
    if (!activeSourceKey) return null;
    try { return localStorage.getItem(activeSourceKey) || null; } catch { return null; }
  });
  const setActiveSourceId = (sid: string | null) => {
    setActiveSourceIdState(sid);
    if (!activeSourceKey) return;
    try {
      if (sid) localStorage.setItem(activeSourceKey, sid);
      else localStorage.removeItem(activeSourceKey);
    } catch {}
  };

  const chat = useNotebookChat(id, activeSourceId);
  const sedefySearch = useNotebookSearch(id, activeSourceId);

  const [input, setInput] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addSourceTab, setAddSourceTab] = useState<"file" | "text" | "competence">("text");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editSourceTitle, setEditSourceTitle] = useState("");
  const [editSourceContent, setEditSourceContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Studio search state
  const [studioActive, setStudioActive] = useState<StudioOption | null>(null);
  const [studioResults, setStudioResults] = useState<SedefyResult[]>([]);
  const [studioOffset, setStudioOffset] = useState(0);
  const [studioSearching, setStudioSearching] = useState(false);
  const [studioHasMore, setStudioHasMore] = useState(true);
  const [creatingType, setCreatingType] = useState<string | null>(null);
  // Cache of the first 3 results per studio option id (after a search has run).
  // Persisted to localStorage per-notebook AND per-active-source so each source
  // keeps its own studio progress.
  const cacheKey = id
    ? `notebook:studioCache:v2:${id}:${activeSourceId || "all"}`
    : null;
  // Per-notebook+source set of result IDs the user explicitly dismissed.
  // Dismissed items are filtered out of cached results AND of new searches.
  const dismissedKey = id
    ? `notebook:studioDismissed:v1:${id}:${activeSourceId || "all"}`
    : null;
  const [studioCache, setStudioCache] = useState<Record<string, SedefyResult[]>>(() => {
    if (!cacheKey) return {};
    try {
      const raw = localStorage.getItem(cacheKey);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (!dismissedKey) return new Set();
    try {
      const raw = localStorage.getItem(dismissedKey);
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });
  // Highlight the freshly-created capsule for a few seconds
  const [highlightedResultId, setHighlightedResultId] = useState<string | null>(null);
  // Mobile tabs: fuentes | chat | studio
  const [mobileTab, setMobileTab] = useState<"fuentes" | "chat" | "studio">("chat");

  // When the active source changes, reload the cache for that scope and clear
  // any in-flight studio selection / viewer so we don't show stale content.
  useEffect(() => {
    if (!cacheKey) return;
    try {
      const raw = localStorage.getItem(cacheKey);
      setStudioCache(raw ? JSON.parse(raw) : {});
    } catch { setStudioCache({}); }
    try {
      const rawD = dismissedKey ? localStorage.getItem(dismissedKey) : null;
      setDismissedIds(new Set<string>(rawD ? JSON.parse(rawD) : []));
    } catch { setDismissedIds(new Set()); }
    setStudioActive(null);
    setStudioResults([]);
    setStudioOffset(0);
    setStudioHasMore(true);
    setViewing(null);
    setViewerExpanded(false);
    setHighlightedResultId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  // Persist cache whenever it changes
  useEffect(() => {
    if (!cacheKey) return;
    try { localStorage.setItem(cacheKey, JSON.stringify(studioCache)); } catch {}
  }, [cacheKey, studioCache]);

  // Persist dismissed IDs whenever they change
  useEffect(() => {
    if (!dismissedKey) return;
    try { localStorage.setItem(dismissedKey, JSON.stringify([...dismissedIds])); } catch {}
  }, [dismissedKey, dismissedIds]);

  // Capsule viewer state (replaces the studio selector when active)
  const [viewing, setViewing] = useState<SedefyResult | null>(null);
  const [viewerExpanded, setViewerExpanded] = useState(false);

  // Source-processed announcements: when a source becomes "ready" we show a
  // user-style card in chat with a preview of the processed content. Clicking
  // the card opens a modal with the full processed text. Announcements are
  // tracked per-notebook in localStorage so they don't re-appear on every
  // mount, but they are NOT persisted to the chat conversation (transient).
  const announcedKey = id ? `notebook:announcedSources:v1:${id}` : null;
  const [announcedIds, setAnnouncedIds] = useState<Set<string>>(() => {
    if (!announcedKey) return new Set();
    try {
      const raw = localStorage.getItem(announcedKey);
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });
  type AnnouncedSource = {
    id: string;
    title: string;
    preview: string;
    fullText: string;
    sourceType: string;
  };
  const [announcedSources, setAnnouncedSources] = useState<AnnouncedSource[]>([]);
  const [viewingSource, setViewingSource] = useState<AnnouncedSource | null>(null);

  const { data: notebook } = useQuery({
    queryKey: ["notebook", id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from("notebooks").select("*").eq("id", id).maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages.length, chat.isStreaming]);

  // If the active source no longer exists in the loaded list (e.g., deleted),
  // fall back to "all sources".
  useEffect(() => {
    if (!activeSourceId) return;
    const list = sources.list.data;
    if (!list || list.length === 0) return;
    if (!list.some((s) => s.id === activeSourceId)) {
      setActiveSourceId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources.list.data, activeSourceId]);

  // Auto-open the "Add source" dialog the first time the user lands on a
  // notebook that still has no sources.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (!id) return;
    if (sources.list.isLoading) return;
    const count = sources.list.data?.length || 0;
    if (count === 0) {
      autoOpenedRef.current = true;
      setShowAdd(true);
    }
  }, [id, sources.list.isLoading, sources.list.data]);

  // Tutorial control: open the source dialog on a chosen tab from outside
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (detail.tab) setAddSourceTab(detail.tab);
      setShowAdd(true);
      autoOpenedRef.current = true;
    };
    window.addEventListener("notebook:open-add-source", handler);
    return () => window.removeEventListener("notebook:open-add-source", handler);
  }, []);

  // Tutorial control: switch the mobile tab from outside
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (detail.tab) setMobileTab(detail.tab);
    };
    window.addEventListener("notebook:set-mobile-tab", handler);
    return () => window.removeEventListener("notebook:set-mobile-tab", handler);
  }, []);

  // Detect sources that just finished processing and announce them in chat.
  useEffect(() => {
    const list = sources.list.data || [];
    const ready = list.filter((s) => s.status === "ready");
    const newOnes = ready.filter((s) => !announcedIds.has(s.id));
    if (newOnes.length === 0) return;

    setAnnouncedSources((prev) => {
      const existing = new Set(prev.map((p) => p.id));
      const additions: AnnouncedSource[] = newOnes
        .filter((s) => !existing.has(s.id))
        .map((s) => {
          const full = (s.extracted_text || "").trim();
          const preview = full.length > 220 ? full.slice(0, 220) + "…" : full;
          return {
            id: s.id,
            title: s.title,
            preview: preview || "(sin contenido extraído)",
            fullText: full || "(sin contenido extraído)",
            sourceType: s.source_type,
          };
        });
      return [...prev, ...additions];
    });
    setAnnouncedIds((prev) => {
      const next = new Set(prev);
      newOnes.forEach((s) => next.add(s.id));
      try {
        if (announcedKey) localStorage.setItem(announcedKey, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, [sources.list.data, announcedIds, announcedKey]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!user) {
    navigate(`/auth?redirect=/notebook/${id}`, { replace: true });
    return null;
  }

  const readyCount = (sources.list.data || []).filter(s => s.status === "ready").length;
  const noSources = readyCount === 0;

  const handleSend = () => {
    if (!input.trim() || chat.isStreaming) return;
    const text = input;
    setInput("");
    chat.sendMessage(text);
  };

  const handleStudio = async (opt: StudioOption) => {
    if (chat.isStreaming || studioSearching) return;
    setStudioActive(opt);
    setStudioOffset(0);

    // If we already cached results for this option, restore them without
    // running the search again or polluting the chat. Show a soft transient
    // prompt asking the user if they want to continue — only once.
    const cached = studioCache[opt.id];
    if (cached && cached.length > 0) {
      // Filter out anything the user previously dismissed.
      const filtered = cached.filter((r) => !dismissedIds.has(r.id));
      if (filtered.length > 0) {
        setStudioResults(filtered);
        setStudioHasMore(filtered.length >= 3);
        const continuePrompt = `Aquí tienes los ${opt.label.toLowerCase()}s que ya encontré para tus fuentes. ¿Quieres continuar con el aprendizaje?`;
        const alreadyShown = chat.messages.some(
          (m) => m.role === "assistant" && m.content === continuePrompt
        );
        if (!alreadyShown) {
          chat.appendAssistantTransient(continuePrompt);
        }
        return;
      }
      // Otherwise fall through to a fresh search (all cached items dismissed).
    }

    setStudioResults([]);
    setStudioHasMore(true);
    setStudioSearching(true);

    // Friendly chat message describing the action (no AI call). The
    // "Estoy buscando…" notice is transient (not persisted) so it doesn't
    // accumulate in the conversation history.
    const verbalType = opt.label.toLowerCase();
    const userMsg = `Buscar ${verbalType} en SEDEFY`;
    const searchingMsg = `Estoy buscando en SEDEFY ${opt.label.toLowerCase()}s que coincidan con tus fuentes…`;
    const progressIndex = await chat.appendProgressLocal(userMsg, searchingMsg);

    try {
      const rawResults = await sedefySearch.search(opt.searchType, 0, 3, opt.readingSubtype);
      const results = rawResults.filter((r) => !dismissedIds.has(r.id));
      setStudioResults(results);
      setStudioHasMore(results.length === 3);
      setStudioCache((prev) => ({ ...prev, [opt.id]: results.slice(0, 3) }));

      if (results.length === 0) {
        const article = opt.id === "path" || opt.id.startsWith("reading") ? "una" : "un";
        const noneMsg =
          opt.createRoute
            ? `No encontré ${opt.label.toLowerCase()} en SEDEFY que coincidan con tus fuentes. ¿Quieres que te genere ${article} ${opt.label.toLowerCase()} con IA basado en tus fuentes? |||STUDIO_CTA:${JSON.stringify({ type: opt.id })}|||`
            : `No encontré ${opt.label.toLowerCase()} en SEDEFY que coincidan con tus fuentes. Los videos no se generan con IA — puedes subir uno desde el botón Crear. |||STUDIO_CTA:${JSON.stringify({ type: opt.id })}|||`;
        await chat.finalizeProgress(progressIndex, noneMsg);
      } else {
        // Replace the transient "Estoy buscando…" with a short success notice
        // that IS persisted, so the user sees a clean trail of what happened.
        await chat.finalizeProgress(
          progressIndex,
          `Encontré ${results.length} ${opt.label.toLowerCase()}${results.length === 1 ? "" : "s"} para tus fuentes. ¿Quieres continuar con el aprendizaje?`
        );
      }
    } finally {
      setStudioSearching(false);
    }
  };

  const handleSearchMore = async () => {
    if (!studioActive || studioSearching) return;
    setStudioSearching(true);
    try {
      const rawNext = await sedefySearch.search(
        studioActive.searchType,
        studioOffset + 3,
        3,
        studioActive.readingSubtype
      );
      const next = rawNext.filter((r) => !dismissedIds.has(r.id));
      setStudioResults((prev) => [...prev, ...next]);
      setStudioOffset((o) => o + 3);
      if (next.length < 3) setStudioHasMore(false);
    } finally {
      setStudioSearching(false);
    }
  };

  const handleRemoveResult = (rid: string) => {
    // Remove from current view AND remember the dismissal so future searches
    // and cached restores skip this item permanently for this notebook+source.
    setStudioResults((prev) => prev.filter((r) => r.id !== rid));
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(rid);
      return next;
    });
    setStudioCache((prev) => {
      const next: Record<string, SedefyResult[]> = {};
      for (const [k, list] of Object.entries(prev)) {
        next[k] = (list || []).filter((r) => r.id !== rid);
      }
      return next;
    });
  };

  const resultUrl = (r: SedefyResult) => {
    if (r.type === "path" || r.type === "course") return `/learning-paths/view/${r.id}?embed=1`;
    const sameType = studioResults.filter((x) => x.type === r.type);
    const playlist = encodeURIComponent(sameType.map((x) => `${x.id}:${x.type}`).join(","));
    const param = r.type === "quiz" ? "quiz" : r.type === "game" ? "game" : "content";
    return `/sedetok?${param}=${r.id}&playlist=${playlist}&embed=1`;
  };

  const openResult = (r: SedefyResult) => {
    setViewing(r);
    setViewerExpanded(false);
  };

  const handleCreateCapsule = async (type: string) => {
    const opt = STUDIO_BY_ID[type];
    if (!opt) return;
    // Video: no AI creator — go to manual upload
    if (!opt.createRoute || opt.id === "video") {
      navigate("/create?type=video");
      return;
    }
    if (!id || creatingType) return;

    setCreatingType(type);
    setMobileTab("chat");
    // Insert a transient progress card as an assistant message (not persisted yet)
    const progressMarker = `|||GENERATING:${JSON.stringify({ type })}|||`;
    const progressIndex = await chat.appendProgressLocal(
      `Crear ${opt.label.toLowerCase()} con IA`,
      progressMarker
    );

    try {
      const { data, error } = await supabase.functions.invoke("notebook-create-capsule", {
        body: { notebookId: id, type, notebookSourceId: activeSourceId },
      });
      if (error) throw error;
      if (!data?.route) throw new Error("Respuesta inválida del generador");

      // Replace the progress card with the final success message (this gets persisted).
      await chat.finalizeProgress(
        progressIndex,
        `✅ Listo. He creado tu ${opt.label.toLowerCase()} y ya está disponible en el panel de Studio.`
      );

      // Build a SedefyResult from the response and prepend it to the studio list + cache.
      const newResult: SedefyResult = {
        id: data.contentId || crypto.randomUUID(),
        title: data.title || `Nueva ${opt.label.toLowerCase()}`,
        subject: data.subject ?? null,
        cover_url: data.cover_url ?? null,
        type: (data.type as SedefyResult["type"]) || opt.searchType,
        readingSubtype: data.readingSubtype ?? opt.readingSubtype ?? null,
      };

      // Make sure the studio panel shows this option, then prepend the new item.
      setStudioActive(opt);
      setMobileTab("studio");
      setStudioResults((prev) => {
        const filtered = prev.filter((r) => r.id !== newResult.id);
        return [newResult, ...filtered];
      });
      setStudioCache((prev) => {
        const existing = (prev[opt.id] || []).filter((r) => r.id !== newResult.id);
        return { ...prev, [opt.id]: [newResult, ...existing].slice(0, 6) };
      });
      setHighlightedResultId(newResult.id);
      setTimeout(() => {
        setHighlightedResultId((cur) => (cur === newResult.id ? null : cur));
      }, 4000);
    } catch (e: any) {
      console.error("create-capsule error", e);
      const msg = e?.context?.body
        ? (() => { try { return JSON.parse(e.context.body)?.error; } catch { return null; } })()
        : null;
      await chat.finalizeProgress(
        progressIndex,
        `❌ No pude crear la cápsula con IA: ${msg || e?.message || "error desconocido"}.`
      );
    } finally {
      setCreatingType(null);
    }
  };

  const handleSaveTitle = async () => {
    if (!id || !titleDraft.trim()) {
      setEditingTitle(false);
      return;
    }
    await rename.mutateAsync({ id, title: titleDraft.trim() });
    setEditingTitle(false);
  };

  return (
    <>
      <Helmet>
        <title>{notebook?.title || "Cuaderno"} | Notebook Sedefy</title>
      </Helmet>

      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 h-14 border-b shrink-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/notebook")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {editingTitle ? (
            <Input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
              className="max-w-md font-semibold"
            />
          ) : (
            <button
              className="flex items-center gap-2 font-semibold hover:text-primary transition"
              onClick={() => { setTitleDraft(notebook?.title || ""); setEditingTitle(true); }}
            >
              <span className="text-lg">{notebook?.cover_emoji || "📓"}</span>
              {notebook?.title || "Cuaderno"}
              <Pencil className="h-3.5 w-3.5 opacity-50" />
            </button>
          )}
        </header>

        {/* Mobile tabs (Fuentes / Chat / Studio) */}
        <div className="lg:hidden flex border-b shrink-0 bg-background">
          {([
            { id: "fuentes", label: "Fuentes" },
            { id: "chat", label: "Chat" },
            { id: "studio", label: "Studio" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setMobileTab(t.id)}
              className={`flex-1 h-11 text-sm font-medium relative transition ${
                mobileTab === t.id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {t.label}
              {mobileTab === t.id && (
                <span className="absolute left-1/2 -translate-x-1/2 bottom-0 h-0.5 w-10 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* 3-column layout — right column grows when viewing a capsule (expandable);
            when expanded, the Fuentes column collapses so chat takes the freed width. */}
        <div
          className={`flex-1 grid grid-cols-1 overflow-hidden ${
            viewing
              ? viewerExpanded
                ? "lg:grid-cols-[0px_1fr_70%]"
                : "lg:grid-cols-[280px_1fr_30%]"
              : "lg:grid-cols-[280px_1fr_320px]"
          }`}
        >
          {/* Sources */}
          <aside
            data-tour="sources-panel"
            className={`border-r overflow-y-auto p-3 lg:block ${
              mobileTab === "fuentes" ? "block" : "hidden"
            } ${viewing && viewerExpanded ? "lg:hidden" : ""}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Fuentes</h2>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(true)} className="gap-1 h-7" data-tour="add-source">
                <Plus className="h-3.5 w-3.5" /> Añadir
              </Button>
            </div>

            {sources.list.isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : (sources.list.data?.length || 0) === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>Sin fuentes aún</p>
                <Button size="sm" className="mt-3" onClick={() => setShowAdd(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Añadir fuente
                </Button>
              </div>
            ) : (
              <ul className="space-y-1.5">
                <li>
                  <button
                    onClick={() => setActiveSourceId(null)}
                    className={`w-full text-left flex items-center gap-2 p-2 rounded-md transition ${
                      activeSourceId === null
                        ? "bg-primary/10 ring-1 ring-primary/40"
                        : "hover:bg-accent"
                    }`}
                  >
                    <Sparkles className={`h-4 w-4 shrink-0 ${activeSourceId === null ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">Todas las fuentes</span>
                  </button>
                </li>
                {sources.list.data?.map((s) => {
                  const Icon = TYPE_ICONS[s.source_type] || FileText;
                  const isActive = activeSourceId === s.id;
                  return (
                    <li key={s.id} className="group">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => s.status === "ready" && setActiveSourceId(s.id)}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === " ") && s.status === "ready") {
                            e.preventDefault();
                            setActiveSourceId(s.id);
                          }
                        }}
                        className={`flex items-start gap-2 p-2 rounded-md transition cursor-pointer ${
                          isActive
                            ? "bg-primary/10 ring-1 ring-primary/40"
                            : "hover:bg-accent"
                        } ${s.status !== "ready" ? "cursor-not-allowed opacity-70" : ""}`}
                      >
                        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${isActive ? "text-primary" : "text-primary/70"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate" title={s.title}>{s.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {s.status === "processing" && (
                              <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Procesando</span>
                            )}
                            {s.status === "ready" && (
                              <span title={s.extracted_text || ""}>
                                {(s.extracted_text || "").trim().slice(0, 120) || s.source_type.toUpperCase()}
                                {(s.extracted_text || "").length > 120 ? "…" : ""}
                              </span>
                            )}
                            {s.status === "error" && <span className="text-destructive">Error</span>}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSourceId(s.id);
                              setEditSourceTitle(s.title);
                              setEditSourceContent(s.extracted_text || "");
                            }}
                            aria-label="Editar fuente"
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeSourceId === s.id) setActiveSourceId(null);
                              sources.remove.mutate(s.id);
                            }}
                            aria-label="Eliminar fuente"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* Chat */}
          <section data-tour="chat-panel" className={`flex-col overflow-hidden lg:flex ${mobileTab === "chat" ? "flex" : "hidden"}`}>
            <div className="flex-1 overflow-y-auto px-4 md:px-12 py-6">
              {chat.messages.length === 0 && announcedSources.length === 0 ? (
                <div className="max-w-2xl mx-auto text-center py-12">
                  <Sparkles className="h-12 w-12 mx-auto text-primary mb-4" />
                  <h2 className="text-2xl font-bold mb-2">{notebook?.title || "Cuaderno"}</h2>
                  <p className="text-muted-foreground mb-6">
                    {noSources
                      ? "Añade fuentes a la izquierda para empezar a conversar con SEDE AI sobre ellas."
                      : `${readyCount} fuente${readyCount === 1 ? "" : "s"} cargada${readyCount === 1 ? "" : "s"}. Pregunta lo que quieras o usa el panel Studio a la derecha.`}
                  </p>
                  {!noSources && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                      {[
                        "Resume las fuentes en 5 puntos clave",
                        "¿Cuáles son los temas principales?",
                        "Genérame preguntas de práctica",
                        "Explica el contenido como si tuviera 10 años",
                      ].map((q) => (
                        <Card
                          key={q}
                          className="p-3 text-sm text-left cursor-pointer hover:bg-accent transition"
                          onClick={() => chat.sendMessage(q)}
                        >
                          {q}
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-4">
                  {/* Announced sources: shown as user-style cards above the conversation */}
                  {announcedSources.map((src) => {
                    const Icon = TYPE_ICONS[src.sourceType] || FileText;
                    return (
                      <div key={`announced-${src.id}`} className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setViewingSource(src)}
                          className="max-w-[85%] rounded-2xl px-4 py-3 bg-primary text-primary-foreground text-left hover:opacity-95 transition shadow-sm"
                          title="Ver contenido procesado"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="text-xs font-semibold uppercase tracking-wide opacity-90">
                              Fuente procesada
                            </span>
                          </div>
                          <p className="font-semibold text-sm mb-1 line-clamp-1">{src.title}</p>
                          <p className="text-xs opacity-90 whitespace-pre-wrap line-clamp-4">
                            {src.preview}
                          </p>
                          <p className="text-[10px] opacity-75 mt-2 underline">
                            Toca para ver el contenido completo
                          </p>
                        </button>
                      </div>
                    );
                  })}
                  {chat.messages.map((m, i) => {
                    if (m.role === "user") {
                      return (
                        <div key={i} className="flex justify-end">
                          <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-primary text-primary-foreground">
                            <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                          </div>
                        </div>
                      );
                    }
                    const { content, paths, contentItems, studioCta, generating } = parseAssistantContent(m.content);
                    if (generating) {
                      return (
                        <div key={i} className="flex justify-start">
                          <div className="max-w-[95%] w-full rounded-2xl px-4 py-5 bg-muted">
                            <CapsuleProgressCard capsuleType={generating.type} />
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="flex justify-start">
                        <div className="max-w-[95%] w-full rounded-2xl px-4 py-3 bg-muted">
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{content || (chat.isStreaming ? "…" : "")}</ReactMarkdown>
                          </div>
                          {paths && paths.length > 0 && <PathPreviewCards paths={paths} />}
                          {contentItems && contentItems.length > 0 && <ContentPreviewCards content={contentItems} />}
                          {studioCta && !chat.isStreaming && (
                            <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-border/40">
                              <Button
                                size="sm"
                                onClick={() => handleCreateCapsule(studioCta.type)}
                                className="gap-1.5"
                                disabled={creatingType === studioCta.type}
                              >
                                {creatingType === studioCta.type ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : studioCta.type === "video" ? (
                                  <ExternalLink className="h-3.5 w-3.5" />
                                ) : (
                                  <Wand2 className="h-3.5 w-3.5" />
                                )}
                                {creatingType === studioCta.type
                                  ? "Generando…"
                                  : STUDIO_BY_ID[studioCta.type] ? ctaLabel(STUDIO_BY_ID[studioCta.type]) : "Crear cápsula"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t p-3 md:p-4 shrink-0" data-tour="chat-input">
              <div className="max-w-3xl mx-auto flex items-end gap-2">
                <Textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={noSources ? "Añade una fuente para conversar…" : "Empieza a escribir…"}
                  className="resize-none min-h-[44px] max-h-32"
                  disabled={chat.isStreaming}
                />
                <Button onClick={handleSend} disabled={!input.trim() || chat.isStreaming} size="icon">
                  {chat.isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-center text-muted-foreground mt-2">
                {readyCount} fuente{readyCount === 1 ? "" : "s"} en este cuaderno
              </p>
            </div>
          </section>

          {/* Studio / Capsule Viewer */}
          <aside data-tour="studio-panel" className={`border-l overflow-hidden lg:flex lg:flex-col ${mobileTab === "studio" ? "flex flex-col" : "hidden"}`}>
            {viewing ? (
              // Capsule viewer (replaces the studio selector while open)
              <>
                <div className="flex items-center gap-1 px-3 h-11 border-b shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setViewing(null)}
                    aria-label="Volver al selector"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-semibold flex-1 truncate" title={viewing.title}>
                    Studio · {viewing.title}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setViewerExpanded((v) => !v)}
                    aria-label={viewerExpanded ? "Contraer" : "Expandir"}
                    title={viewerExpanded ? "Contraer" : "Expandir"}
                  >
                    {viewerExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => window.open(resultUrl(viewing), "_blank")}
                    aria-label="Abrir en nueva pestaña"
                    title="Abrir en nueva pestaña"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden bg-background">
                  <iframe
                    key={viewing.id}
                    src={resultUrl(viewing)}
                    title={viewing.title}
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen; clipboard-write"
                  />
                </div>
              </>
            ) : (
              // Studio selector + search results
              <div className="overflow-y-auto p-3 flex-1">
                <h2 className="font-semibold text-sm mb-3 flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-primary" /> Studio
                </h2>
                <p className="text-xs text-muted-foreground mb-3">Genera cápsulas Sedefy a partir de tus fuentes.</p>
                <div className="grid grid-cols-2 gap-2">
                  {STUDIO_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = studioActive?.id === opt.id;
                    const cachedCount = studioCache[opt.id]?.length ?? 0;
                    const hasResults = cachedCount > 0;
                    return (
                      <button
                        key={opt.id}
                        data-tour={`studio-${opt.id}`}
                        onClick={() => handleStudio(opt)}
                        disabled={chat.isStreaming || studioSearching || noSources}
                        className={`relative flex flex-col items-start gap-1.5 p-3 rounded-lg border bg-gradient-to-br disabled:opacity-50 disabled:cursor-not-allowed transition text-left ${opt.color} ${
                          isActive ? "ring-2 ring-offset-1 ring-current shadow-sm" : ""
                        } ${hasResults ? "border-emerald-500/60" : ""}`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-[11px] font-semibold leading-tight text-foreground">{opt.label}</span>
                        {hasResults && (
                          <span
                            className="absolute top-1 right-1 flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 text-white shadow-sm"
                            title={`${cachedCount} resultado${cachedCount === 1 ? "" : "s"} guardado${cachedCount === 1 ? "" : "s"}`}
                          >
                            <Check className="h-2.5 w-2.5" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {noSources && (
                  <p className="text-[11px] text-muted-foreground mt-3 text-center">
                    Añade fuentes para activar Studio
                  </p>
                )}

                {/* Studio search results */}
                {studioActive && (
                  <div className="mt-4 pt-3 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-xs font-semibold flex items-center gap-1.5 ${studioActive.color.split(" ").find(c => c.startsWith("text-")) || "text-primary"}`}>
                        <studioActive.icon className="h-3.5 w-3.5" />
                        {studioActive.label} sugeridos
                      </h3>
                      <button
                        className="text-[10px] text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setStudioActive(null);
                          setStudioResults([]);
                        }}
                      >
                        Cerrar
                      </button>
                    </div>

                    {studioSearching && studioResults.length === 0 ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    ) : studioResults.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground text-center py-3">
                        Sin resultados
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {studioResults.map((r) => (
                          <li
                            key={r.id}
                            className={`group relative rounded-lg border overflow-hidden bg-card hover:shadow-md transition cursor-pointer bg-gradient-to-br ${studioActive.color} ${highlightedResultId === r.id ? "ring-2 ring-primary ring-offset-2 animate-pulse shadow-lg" : ""}`}
                            onClick={() => openResult(r)}
                          >
                            <div className="aspect-video w-full overflow-hidden bg-muted/40 relative">
                              {r.cover_url ? (
                                <img
                                  src={r.cover_url}
                                  alt={r.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  width={260}
                                  height={146}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <studioActive.icon className="h-7 w-7 opacity-60" />
                                </div>
                              )}
                              <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-background/90 backdrop-blur uppercase tracking-wide">
                                {studioActive.label}
                              </span>
                              <button
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition p-1 rounded-full bg-background/90 hover:bg-destructive/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveResult(r.id);
                                }}
                                aria-label="Quitar"
                              >
                                <X className="h-3 w-3 text-destructive" />
                              </button>
                            </div>
                            <div className="p-2">
                              <p className="text-[11px] font-semibold line-clamp-2 leading-tight text-foreground">{r.title}</p>
                              {r.subject && (
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{r.subject}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Actions */}
                    <div className="mt-2.5 flex flex-col gap-1.5">
                      {studioHasMore && studioResults.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-[11px]"
                          onClick={handleSearchMore}
                          disabled={studioSearching}
                          data-tour="studio-search-more"
                        >
                          {studioSearching ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Buscar más"
                          )}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="w-full h-7 text-[11px] gap-1"
                        onClick={() => handleCreateCapsule(studioActive.id)}
                        disabled={creatingType === studioActive.id}
                        data-tour="studio-generate-ai"
                      >
                        {creatingType === studioActive.id ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Generando…
                          </>
                        ) : studioActive.createRoute ? (
                          <>
                            <Wand2 className="h-3 w-3" />
                            Generar {studioActive.label.toLowerCase()} con IA
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-3 w-3" />
                            Subir un video
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>

        {/* Mobile: floating add sources button (only on Fuentes tab) */}
        {mobileTab === "fuentes" && (
          <Button
            className="lg:hidden fixed bottom-20 right-4 rounded-full shadow-lg"
            size="icon"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      <AddSourceDialog open={showAdd} onClose={() => setShowAdd(false)} notebookId={id!} defaultTab={addSourceTab} />

      <Dialog open={!!editingSourceId} onOpenChange={(v) => { if (!v) setEditingSourceId(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar fuente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input
                value={editSourceTitle}
                onChange={(e) => setEditSourceTitle(e.target.value)}
                placeholder="Título de la fuente"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Contenido</label>
              <Textarea
                rows={12}
                value={editSourceContent}
                onChange={(e) => setEditSourceContent(e.target.value)}
                placeholder="Contenido de la fuente…"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Este texto es lo que SEDE AI usará como contexto al chatear sobre esta fuente.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingSourceId(null)} disabled={sources.update.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!editingSourceId) return;
                await sources.update.mutateAsync({
                  id: editingSourceId,
                  title: editSourceTitle.trim() || "Sin título",
                  extracted_text: editSourceContent,
                });
                setEditingSourceId(null);
              }}
              disabled={sources.update.isPending}
            >
              {sources.update.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: full processed content of a source */}
      <Dialog open={!!viewingSource} onOpenChange={(v) => { if (!v) setViewingSource(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {viewingSource?.title || "Contenido procesado"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Este es el contenido que SEDE AI usará como contexto para esta fuente.
            </p>
            <div className="max-h-[60vh] overflow-y-auto rounded-md border bg-muted/30 p-3">
              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                {viewingSource?.fullText || ""}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setViewingSource(null)}>Cerrar</Button>
            {viewingSource && (
              <Button
                onClick={() => {
                  setEditingSourceId(viewingSource.id);
                  setEditSourceTitle(viewingSource.title);
                  setEditSourceContent(viewingSource.fullText);
                  setViewingSource(null);
                }}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" /> Editar fuente
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NotebookTutorial />
      <NotebookTutorialHelpButton />
    </>
  );
};

export default NotebookView;
