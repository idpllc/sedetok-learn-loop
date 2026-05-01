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
import {
  ArrowLeft, Plus, Send, Loader2, FileText, Type, Link as LinkIcon, Video, GraduationCap,
  Trash2, Sparkles, BookOpen, Map, Brain, Gamepad2, FileQuestion, Book, Pencil, Wand2, ExternalLink
} from "lucide-react";
import { AddSourceDialog } from "@/components/notebook/AddSourceDialog";
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
  const route = (item: any) => {
    if (item.type === "quiz") return `/?quiz=${item.id}`;
    if (item.type === "game") return `/?game=${item.id}`;
    return `/sedetok?content=${item.id}`;
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
  return { content, paths, contentItems, studioCta };
};

// ----- Main page -----

const NotebookView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { rename } = useNotebooks();
  const sources = useNotebookSources(id);
  const chat = useNotebookChat(id);
  const sedefySearch = useNotebookSearch(id);

  const [input, setInput] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Studio search state
  const [studioActive, setStudioActive] = useState<StudioOption | null>(null);
  const [studioResults, setStudioResults] = useState<SedefyResult[]>([]);
  const [studioOffset, setStudioOffset] = useState(0);
  const [studioSearching, setStudioSearching] = useState(false);
  const [studioHasMore, setStudioHasMore] = useState(true);
  const [creatingType, setCreatingType] = useState<string | null>(null);

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
    setStudioResults([]);
    setStudioOffset(0);
    setStudioHasMore(true);
    setStudioSearching(true);

    // Friendly chat message describing the action (no AI call)
    const verbalType = opt.label.toLowerCase();
    const userMsg = `Buscar ${verbalType} en SEDEFY`;
    const assistantMsg = `Estoy buscando en SEDEFY ${opt.label.toLowerCase()}s que coincidan con tus fuentes…`;
    await chat.appendLocal(userMsg, assistantMsg);

    try {
      const results = await sedefySearch.search(opt.searchType, 0, 3, opt.readingSubtype);
      setStudioResults(results);
      setStudioHasMore(results.length === 3);

      if (results.length === 0) {
        const article = opt.id === "path" || opt.id.startsWith("reading") ? "una" : "un";
        const noneMsg =
          opt.createRoute
            ? `No encontré ${opt.label.toLowerCase()} en SEDEFY que coincidan con tus fuentes. ¿Quieres que te genere ${article} ${opt.label.toLowerCase()} con IA basado en tus fuentes? |||STUDIO_CTA:${JSON.stringify({ type: opt.id })}|||`
            : `No encontré ${opt.label.toLowerCase()} en SEDEFY que coincidan con tus fuentes. Los videos no se generan con IA — puedes subir uno desde el botón Crear. |||STUDIO_CTA:${JSON.stringify({ type: opt.id })}|||`;
        await chat.appendLocal("", noneMsg);
      }
    } finally {
      setStudioSearching(false);
    }
  };

  const handleSearchMore = async () => {
    if (!studioActive || studioSearching) return;
    setStudioSearching(true);
    try {
      const next = await sedefySearch.search(
        studioActive.searchType,
        studioOffset + 3,
        3,
        studioActive.readingSubtype
      );
      setStudioResults((prev) => [...prev, ...next]);
      setStudioOffset((o) => o + 3);
      if (next.length < 3) setStudioHasMore(false);
    } finally {
      setStudioSearching(false);
    }
  };

  const handleRemoveResult = (rid: string) => {
    setStudioResults((prev) => prev.filter((r) => r.id !== rid));
  };

  const openResult = (r: SedefyResult) => {
    if (r.type === "quiz") window.open(`/?quiz=${r.id}`, "_blank");
    else if (r.type === "game") window.open(`/?game=${r.id}`, "_blank");
    else if (r.type === "path" || r.type === "course") window.open(`/learning-paths/view/${r.id}`, "_blank");
    else window.open(`/sedetok?content=${r.id}`, "_blank");
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
    await chat.appendLocal(
      `Crear ${opt.label.toLowerCase()} con IA`,
      `Estoy generando ${opt.label.toLowerCase()} con IA usando tus fuentes. Esto puede tardar unos segundos…`
    );

    try {
      const { data, error } = await supabase.functions.invoke("notebook-create-capsule", {
        body: { notebookId: id, type },
      });
      if (error) throw error;
      if (!data?.route) throw new Error("Respuesta inválida");

      await chat.appendLocal(
        "",
        `✅ Listo. He creado tu ${opt.label.toLowerCase()} y la he publicado. Abriendo…`
      );
      // Open the new capsule in a new tab so the notebook stays open
      window.open(data.route, "_blank");
    } catch (e: any) {
      console.error(e);
      await chat.appendLocal(
        "",
        `❌ No pude crear la cápsula con IA: ${e?.message || "error desconocido"}.`
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

        {/* 3-column layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[280px_1fr_300px] overflow-hidden">
          {/* Sources */}
          <aside className="border-r overflow-y-auto p-3 hidden md:block">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Fuentes</h2>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(true)} className="gap-1 h-7">
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
                {sources.list.data?.map((s) => {
                  const Icon = TYPE_ICONS[s.source_type] || FileText;
                  return (
                    <li key={s.id} className="group">
                      <div className="flex items-start gap-2 p-2 rounded-md hover:bg-accent transition">
                        <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate" title={s.title}>{s.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.status === "processing" && (
                              <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Procesando</span>
                            )}
                            {s.status === "ready" && <span>{s.source_type.toUpperCase()}</span>}
                            {s.status === "error" && <span className="text-destructive">Error</span>}
                          </p>
                        </div>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition"
                          onClick={() => sources.remove.mutate(s.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* Chat */}
          <section className="flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 md:px-12 py-6">
              {chat.messages.length === 0 ? (
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
                    const { content, paths, contentItems, studioCta } = parseAssistantContent(m.content);
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
            <div className="border-t p-3 md:p-4 shrink-0">
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

          {/* Studio */}
          <aside className="border-l overflow-y-auto p-3 hidden md:block">
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-primary" /> Studio
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Genera cápsulas Sedefy a partir de tus fuentes.</p>
            <div className="grid grid-cols-2 gap-2">
              {STUDIO_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = studioActive?.id === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleStudio(opt)}
                    disabled={chat.isStreaming || studioSearching || noSources}
                    className={`flex flex-col items-start gap-1.5 p-3 rounded-lg border bg-gradient-to-br disabled:opacity-50 disabled:cursor-not-allowed transition text-left ${opt.color} ${
                      isActive ? "ring-2 ring-offset-1 ring-current shadow-sm" : ""
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[11px] font-semibold leading-tight text-foreground">{opt.label}</span>
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
                        className={`group relative rounded-lg border overflow-hidden bg-card hover:shadow-md transition cursor-pointer bg-gradient-to-br ${studioActive.color}`}
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
          </aside>
        </div>

        {/* Mobile: floating add sources button */}
        <Button
          className="md:hidden fixed bottom-20 right-4 rounded-full shadow-lg"
          size="icon"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <AddSourceDialog open={showAdd} onClose={() => setShowAdd(false)} notebookId={id!} />
    </>
  );
};

export default NotebookView;
