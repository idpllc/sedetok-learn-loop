import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Send, Loader2, MessageSquare, Trash2, Plus, ArrowLeft } from "lucide-react";
import { useSedeAIChat } from "@/hooks/useSedeAIChat";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PathData {
  id: string;
  title: string;
  description: string;
  category?: string;
  subject?: string;
  creator?: string;
  cover_url?: string;
}

const PathCards = ({ paths }: { paths: PathData[] }) => {
  const navigate = useNavigate();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {paths.map((path) => (
        <Card
          key={path.id}
          className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
          onClick={() => navigate(`/learning-paths/${path.id}`)}
        >
          {path.cover_url && (
            <div className="aspect-video w-full overflow-hidden bg-muted">
              <img
                src={path.cover_url}
                alt={path.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-2 line-clamp-2">{path.title}</h3>
            {path.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {path.description}
              </p>
            )}
            <div className="flex gap-2 flex-wrap">
              {path.category && (
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                  {path.category}
                </span>
              )}
              {path.subject && (
                <span className="text-xs px-2 py-1 bg-secondary/10 text-secondary-foreground rounded-full">
                  {path.subject}
                </span>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export const SedeAIChat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    conversations,
    messages,
    isLoading,
    isStreaming,
    currentConversationId,
    sendMessage,
    selectConversation,
    deleteConversation,
  } = useSedeAIChat();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input;
    setInput("");
    await sendMessage(message);
  };

  const handleNewChat = () => {
    selectConversation(null);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          "w-80 border-r bg-card transition-all duration-300 relative z-30",
          showSidebar ? "translate-x-0" : "-translate-x-full absolute lg:relative"
        )}
      >
        <div className="p-4 border-b flex items-center justify-between bg-card relative z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">SEDE AI</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            className="h-8 w-8"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100%-5rem)]">
          <div className="p-4 space-y-2">
            {conversations.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No hay conversaciones aún.
                <br />
                ¡Inicia una nueva!
              </div>
            ) : (
              conversations.map((conv, index) => (
                <div
                  key={conv.id}
                  className="relative"
                  style={{ zIndex: conversations.length - index }}
                >
                  <Card
                    className={cn(
                      "p-3 cursor-pointer hover:bg-accent transition-colors group relative",
                      currentConversationId === conv.id && "bg-accent border-primary"
                    )}
                    onClick={() => selectConversation(conv.id)}
                  >
                    <div className="flex items-start justify-between gap-2 pr-8">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {conv.title || "Nueva conversación"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(conv.updated_at).toLocaleDateString("es", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 z-20"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("¿Eliminar esta conversación?")) {
                            deleteConversation(conv.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </Card>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-0">
        {/* Header */}
        <div className="p-4 border-b bg-card flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSidebar(!showSidebar)}
            className="lg:hidden flex-shrink-0"
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">SEDE AI</h1>
              <p className="text-xs text-muted-foreground">
                Tu asistente educativo inteligente
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2">¡Hola! Soy SEDE AI</h2>
                <p className="text-muted-foreground mb-6">
                  Estoy aquí para ayudarte con tus estudios, sugerirte rutas de
                  aprendizaje y más.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  <Card
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() =>
                      sendMessage("¿Qué rutas de aprendizaje me recomiendas?")
                    }
                  >
                    <p className="text-sm font-medium">
                      ¿Qué rutas me recomiendas?
                    </p>
                  </Card>
                  <Card
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => sendMessage("Analiza mi progreso académico")}
                  >
                    <p className="text-sm font-medium">
                      Analiza mi progreso
                    </p>
                  </Card>
                  <Card
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() =>
                      sendMessage("¿Qué cursos debo tomar para mejorar?")
                    }
                  >
                    <p className="text-sm font-medium">
                      ¿Qué cursos me ayudarían?
                    </p>
                  </Card>
                  <Card
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() =>
                      sendMessage("Dame consejos para mi desarrollo profesional")
                    }
                  >
                    <p className="text-sm font-medium">
                      Consejos profesionales
                    </p>
                  </Card>
                </div>
              </div>
            ) : (
              messages.map((message, idx) => {
                // Check if message contains path data
                const pathsMatch = message.content.match(/\|\|\|PATHS_DATA:(.*?)\|\|\|/);
                let messageContent = message.content;
                let pathsData: PathData[] = [];

                if (pathsMatch) {
                  try {
                    pathsData = JSON.parse(pathsMatch[1]);
                    messageContent = message.content.replace(/\|\|\|PATHS_DATA:.*?\|\|\|/, '').trim();
                  } catch (e) {
                    console.error('Error parsing paths data:', e);
                  }
                }

                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <Avatar className="w-8 h-8 mt-1">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600">
                          <Sparkles className="w-4 h-4 text-white" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="max-w-[80%]">
                      <Card
                        className={cn(
                          "p-3",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {messageContent}
                        </p>
                      </Card>
                      {pathsData.length > 0 && <PathCards paths={pathsData} />}
                    </div>
                    {message.role === "user" && (
                      <Avatar className="w-8 h-8 mt-1">
                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                        <AvatarFallback>
                          {user?.user_metadata?.full_name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })
            )}
            {isStreaming && (
              <div className="flex gap-3 justify-start">
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600">
                    <Sparkles className="w-4 h-4 text-white" />
                  </AvatarFallback>
                </Avatar>
                <Card className="p-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </Card>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t bg-card">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu pregunta o solicitud..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};