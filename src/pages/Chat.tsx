import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useChat, ChatConversation, ChatMessage } from "@/hooks/useChat";
import { useInstitution } from "@/hooks/useInstitution";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Paperclip,
  Search,
  Plus,
  Users,
  MessageCircle,
  Smile,
  X,
  Check,
  CheckCheck,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

// Emoji picker data
const EMOJI_LIST = ["😀","😂","😍","🥰","😎","🤔","👍","👏","🎉","❤️","🔥","💯","✅","📚","🎓","📝","👋","🙏","💪","⭐","😊","🤗","😢","😮","🫡","🤝","🥳","🏆","📖","🧠"];

const ChatPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const {
    conversations,
    activeConversation,
    messages,
    loadingConversations,
    loadingMessages,
    sending,
    openConversation,
    sendMessage,
    createDirectConversation,
    uploadChatFile,
    searchUsers,
    searchInstitutionUsers,
    setActiveConversation,
  } = useChat();
  const { myMembership } = useInstitution();

  const [messageInput, setMessageInput] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Small delay to let Supabase finish propagating the session from localStorage
      // before concluding the user is truly unauthenticated.
      const timer = setTimeout(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            navigate("/auth");
          }
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const results = myMembership
      ? await searchInstitutionUsers(q, myMembership.institution_id)
      : await searchUsers(q);
    setSearchResults(results);
    setSearching(false);
  };

  const handleStartChat = async (userId: string) => {
    await createDirectConversation(userId, myMembership?.institution_id);
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSend = async () => {
    if (!messageInput.trim() && !uploading) return;
    const text = messageInput.trim();
    setMessageInput("");
    setShowEmoji(false);
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "file") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadChatFile(file);
    if (url) {
      await sendMessage(
        type === "image" ? "📷 Imagen" : `📎 ${file.name}`,
        type === "image" ? "image" : "file",
        url,
        file.name
      );
    }
    setUploading(false);
    e.target.value = "";
  };

  const formatMsgTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, "HH:mm");
    if (isYesterday(d)) return "Ayer " + format(d, "HH:mm");
    return format(d, "dd/MM HH:mm");
  };

  const formatConvTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, "HH:mm");
    if (isYesterday(d)) return "Ayer";
    return format(d, "dd/MM", { locale: es });
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getConvAvatar = (conv: ChatConversation) => {
    if (conv.type === "group") return conv.avatar_url;
    const other = conv.participants?.find((p) => p.user_id !== user?.id);
    return other?.profile?.avatar_url;
  };

  const getConvName = (conv: ChatConversation) => {
    if (conv.name) return conv.name;
    if (conv.type === "direct") {
      const other = conv.participants?.find((p) => p.user_id !== user?.id);
      return other?.profile?.full_name || other?.profile?.username || "Chat";
    }
    return "Grupo";
  };

  const activeConv = conversations.find((c) => c.id === activeConversation);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar - Conversations List */}
      <div
        className={`${
          activeConversation ? "hidden md:flex" : "flex"
        } flex-col w-full md:w-96 border-r border-border bg-card`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Chat</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
          >
            {showSearch ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </Button>
        </div>

        {/* Search / New Chat */}
        {showSearch && (
          <div className="p-3 border-b border-border space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuario..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            {searching && <p className="text-sm text-muted-foreground px-2">Buscando...</p>}
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => handleStartChat(u.id)}
                className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={u.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(u.full_name || u.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {u.full_name || u.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{u.username}
                    {u.member_role && (
                      <Badge variant="secondary" className="ml-2 text-[10px] px-1 py-0">
                        {u.member_role === "teacher" ? "Docente" : u.member_role === "admin" ? "Admin" : u.member_role === "coordinator" ? "Coordinador" : u.member_role === "student" ? "Estudiante" : u.member_role}
                      </Badge>
                    )}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Conversation list */}
        <ScrollArea className="flex-1">
          {loadingConversations ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <MessageCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">No hay conversaciones</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Toca el botón + para iniciar un chat
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv.id)}
                  className={`flex items-center gap-3 w-full p-4 hover:bg-muted/50 transition-colors ${
                    activeConversation === conv.id ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getConvAvatar(conv) || undefined} />
                      <AvatarFallback className={`${conv.type === "group" ? "bg-secondary/20 text-secondary" : "bg-primary/10 text-primary"} text-sm`}>
                        {conv.type === "group" ? (
                          <Users className="h-5 w-5" />
                        ) : (
                          getInitials(getConvName(conv))
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {(conv.unread_count || 0) > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {getConvName(conv)}
                      </p>
                      {conv.last_message && (
                        <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
                          {formatConvTime(conv.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {conv.last_message?.content || "Sin mensajes"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div
        className={`${
          activeConversation ? "flex" : "hidden md:flex"
        } flex-col flex-1 bg-background`}
      >
        {!activeConversation ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="bg-primary/5 rounded-full p-6 mb-4">
              <MessageCircle className="h-16 w-16 text-primary/40" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Bienvenido al Chat
            </h2>
            <p className="text-muted-foreground max-w-md">
              Selecciona una conversación o busca un usuario para empezar a chatear
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-3 border-b border-border flex items-center gap-3 bg-card">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setActiveConversation(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarImage src={getConvAvatar(activeConv!) || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {activeConv?.type === "group" ? (
                    <Users className="h-4 w-4" />
                  ) : (
                    getInitials(getConvName(activeConv!))
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate text-sm">
                  {getConvName(activeConv!)}
                </p>
                {activeConv?.type === "group" && (
                  <p className="text-xs text-muted-foreground">
                    {activeConv.participants?.length || 0} participantes
                  </p>
                )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-2">
              {loadingMessages ? (
                <div className="space-y-4 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : ""}`}>
                      <Skeleton className="h-12 w-48 rounded-2xl" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <p className="text-sm text-muted-foreground">
                    No hay mensajes aún. ¡Envía el primero! 👋
                  </p>
                </div>
              ) : (
                <div className="space-y-1 py-2">
                  {messages.map((msg, idx) => {
                    const isMine = msg.sender_id === user?.id;
                    const showSender =
                      activeConv?.type === "group" &&
                      !isMine &&
                      (idx === 0 || messages[idx - 1].sender_id !== msg.sender_id);

                    return (
                      <div key={msg.id}>
                        {showSender && (
                          <p className="text-[11px] text-muted-foreground ml-2 mt-2 mb-0.5 font-medium">
                            {msg.sender?.full_name || msg.sender?.username}
                          </p>
                        )}
                        <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                              isMine
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted text-foreground rounded-bl-md"
                            }`}
                          >
                            {msg.message_type === "image" && msg.file_url && (
                              <img
                                src={msg.file_url}
                                alt="Imagen"
                                className="rounded-lg max-w-full max-h-60 mb-1 cursor-pointer"
                                onClick={() => window.open(msg.file_url!, "_blank")}
                              />
                            )}
                            {msg.message_type === "file" && msg.file_url && (
                              <a
                                href={msg.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 underline text-sm"
                              >
                                <Paperclip className="h-3 w-3" />
                                {msg.file_name || "Archivo"}
                              </a>
                            )}
                            {msg.content && (
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {msg.content}
                              </p>
                            )}
                            <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : ""}`}>
                              <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                {formatMsgTime(msg.created_at)}
                              </span>
                              {isMine && (
                                <CheckCheck className={`h-3 w-3 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`} />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Emoji Picker */}
            {showEmoji && (
              <div className="border-t border-border bg-card px-4 py-2">
                <div className="flex flex-wrap gap-1">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setMessageInput((prev) => prev + emoji);
                        setShowEmoji(false);
                      }}
                      className="text-xl hover:bg-muted rounded p-1 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 border-t border-border bg-card flex items-center gap-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, "image")}
              />
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => handleFileUpload(e, "file")}
              />
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setShowEmoji(!showEmoji)}
              >
                <Smile className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
              >
                <ImageIcon className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              <Input
                placeholder="Escribe un mensaje..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 rounded-full"
                disabled={sending || uploading}
              />
              <Button
                size="icon"
                className="rounded-full flex-shrink-0"
                onClick={handleSend}
                disabled={!messageInput.trim() || sending || uploading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
