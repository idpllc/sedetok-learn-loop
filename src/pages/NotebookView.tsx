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
  Trash2, Sparkles, BookOpen, Map, Brain, Gamepad2, FileQuestion, Book, Pencil
} from "lucide-react";
import { AddSourceDialog } from "@/components/notebook/AddSourceDialog";
import ReactMarkdown from "react-markdown";

const TYPE_ICONS: Record<string, any> = {
  pdf: FileText, docx: FileText, xlsx: FileText, text: Type, url: LinkIcon, video: Video, competence: GraduationCap,
};

const STUDIO_OPTIONS = [
  { id: "video", label: "Video", icon: Video, prompt: "Recomiéndame videos en SEDEFY relacionados con las fuentes de este cuaderno." },
  { id: "reading", label: "Lectura", icon: Book, prompt: "Genera una lectura/resumen estructurado a partir de las fuentes de este cuaderno." },
  { id: "mindmap", label: "Mapa mental", icon: Brain, prompt: "Crea un mapa mental jerárquico (idea central, ramas y sub-ramas) sobre los temas principales de las fuentes." },
  { id: "quiz", label: "Quiz", icon: FileQuestion, prompt: "Genera 10 preguntas tipo quiz (opción múltiple A/B/C/D) basadas en las fuentes, con respuestas y explicaciones." },
  { id: "game", label: "Juego", icon: Gamepad2, prompt: "Sugiéreme juegos educativos en SEDEFY relacionados y propón un mini-juego (palabras, ordenar, conectar) basado en las fuentes." },
  { id: "path", label: "Ruta", icon: Map, prompt: "Diseña una ruta de aprendizaje a partir de las fuentes de este cuaderno: módulos, objetivos, actividades sugeridas." },
  { id: "course", label: "Curso", icon: BookOpen, prompt: "Estructura un curso completo basado en las fuentes: unidades, lecciones, evaluaciones." },
];

const NotebookView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { rename } = useNotebooks();
  const sources = useNotebookSources(id);
  const chat = useNotebookChat(id);

  const [input, setInput] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleStudio = (prompt: string) => {
    if (chat.isStreaming) return;
    chat.sendMessage(prompt);
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
                  {chat.messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {m.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{m.content || (chat.isStreaming ? "…" : "")}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
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
                    onClick={() => handleStudio(opt.prompt)}
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
