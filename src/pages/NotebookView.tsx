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
import { useNotebookSearch, type SedefyResult } from "@/hooks/useNotebookSearch";
import { X } from "lucide-react";

const TYPE_ICONS: Record<string, any> = {
  pdf: FileText, docx: FileText, xlsx: FileText, text: Type, url: LinkIcon, video: Video, competence: GraduationCap,
};

type StudioOption = {
  id: string;
  label: string;
  icon: any;
  /** Content type filter for SEDEFY library search */
  searchType: "video" | "reading" | "quiz" | "game" | "mindmap" | "path" | "course";
  /** Route to AI-powered creator. null => no AI creator (e.g., video). */
  createRoute: string | null;
  /** Prompt sent to AI: forces it to FIRST search existing capsules, then offer to create. */
  prompt: string;
};

const STUDIO_OPTIONS: StudioOption[] = [
  {
    id: "video",
    label: "Video",
    icon: Video,
    searchType: "video",
    createRoute: null,
    prompt: "El usuario quiere un VIDEO sobre los temas de este cuaderno. Usa search_content con content_type='video' y términos extraídos de las fuentes para mostrarle videos existentes en SEDEFY. Tras presentar los resultados, escribe en el cuerpo: 'Los videos no se pueden generar con IA, pero puedes subir uno desde el botón Crear.' NO ofrezcas crear un video con IA.",
  },
  {
    id: "reading",
    label: "Lectura",
    icon: Book,
    searchType: "reading",
    createRoute: "/create?type=reading",
    prompt: "El usuario quiere una LECTURA sobre los temas de este cuaderno. PRIMERO usa search_content con content_type='reading' y términos clave de las fuentes. Presenta brevemente los resultados encontrados. Termina tu respuesta con la pregunta exacta: '¿Quieres que te cree una nueva lectura con IA basada en tus fuentes?'",
  },
  {
    id: "mindmap",
    label: "Mapa mental",
    icon: Brain,
    searchType: "mindmap",
    createRoute: "/create?type=mindmap",
    prompt: "El usuario quiere un MAPA MENTAL sobre los temas de este cuaderno. PRIMERO usa search_content con términos clave + 'mapa mental' para buscar mapas existentes en SEDEFY. Presenta brevemente los resultados. Termina con la pregunta exacta: '¿Quieres que te cree un nuevo mapa mental con IA basado en tus fuentes?'",
  },
  {
    id: "quiz",
    label: "Quiz",
    icon: FileQuestion,
    searchType: "quiz",
    createRoute: "/create?type=quiz",
    prompt: "El usuario quiere un QUIZ sobre los temas de este cuaderno. PRIMERO usa search_content con content_type='quiz' y términos clave de las fuentes. Presenta brevemente los quizzes existentes encontrados. Termina con la pregunta exacta: '¿Quieres que te cree un nuevo quiz con IA basado en tus fuentes?'",
  },
  {
    id: "game",
    label: "Juego",
    icon: Gamepad2,
    searchType: "game",
    createRoute: "/create?type=game",
    prompt: "El usuario quiere un JUEGO educativo sobre los temas de este cuaderno. PRIMERO usa search_content con content_type='game' y términos clave de las fuentes. Presenta brevemente los juegos existentes. Termina con la pregunta exacta: '¿Quieres que te cree un nuevo juego con IA basado en tus fuentes?'",
  },
  {
    id: "path",
    label: "Ruta",
    icon: Map,
    searchType: "path",
    createRoute: "/learning-paths/create",
    prompt: "El usuario quiere una RUTA DE APRENDIZAJE sobre los temas de este cuaderno. PRIMERO usa search_learning_paths con términos clave de las fuentes. Presenta brevemente las rutas existentes. Termina con la pregunta exacta: '¿Quieres que te cree una nueva ruta de aprendizaje con IA basada en tus fuentes?'",
  },
  {
    id: "course",
    label: "Curso",
    icon: BookOpen,
    searchType: "course",
    createRoute: "/courses/create",
    prompt: "El usuario quiere un CURSO completo sobre los temas de este cuaderno. PRIMERO usa search_learning_paths para mostrar rutas/cursos existentes relacionados. Presenta brevemente los resultados. Termina con la pregunta exacta: '¿Quieres que te cree un nuevo curso con IA basado en tus fuentes?'",
  },
];

const STUDIO_BY_ID: Record<string, StudioOption> = STUDIO_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.id]: o }),
  {}
);

const CTA_LABEL: Record<string, string> = {
  reading: "✨ Crear lectura con IA",
  mindmap: "✨ Crear mapa mental con IA",
  quiz: "✨ Crear quiz con IA",
  game: "✨ Crear juego con IA",
  path: "✨ Crear ruta con IA",
  course: "✨ Crear curso con IA",
  video: "Subir un video",
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

  const handleStudio = (opt: StudioOption) => {
    if (chat.isStreaming) return;
    chat.sendMessage(opt.prompt, opt.id);
  };

  const handleCreateCapsule = (type: string) => {
    const opt = STUDIO_BY_ID[type];
    if (!opt) return;
    if (!opt.createRoute) {
      // Video case: send to upload page
      navigate("/create?type=video");
      return;
    }
    // Pass notebook id so creator pages can use sources for AI generation
    const sep = opt.createRoute.includes("?") ? "&" : "?";
    navigate(`${opt.createRoute}${sep}notebook=${id}`);
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
                              >
                                {studioCta.type === "video" ? (
                                  <ExternalLink className="h-3.5 w-3.5" />
                                ) : (
                                  <Wand2 className="h-3.5 w-3.5" />
                                )}
                                {CTA_LABEL[studioCta.type] || "Crear cápsula"}
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
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleStudio(opt)}
                    disabled={chat.isStreaming || noSources}
                    className="flex flex-col items-start gap-1 p-3 rounded-lg border bg-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition text-left"
                  >
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>
            {noSources && (
              <p className="text-[11px] text-muted-foreground mt-3 text-center">
                Añade fuentes para activar Studio
              </p>
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
