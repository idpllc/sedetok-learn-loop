import React, { useState, useRef, useEffect, useCallback } from "react";
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
import { SedeAIChat } from "@/components/SedeAIChat";
import {
  ArrowLeft, Send, Image as ImageIcon, Paperclip, Search, Plus, Users,
  MessageCircle, Smile, X, CheckCheck, Hash, MoreVertical, Camera,
  LogOut, Home, Play, Sparkles, Map, BookOpen, Gamepad2, Radio, Award,
  User, Trash2, Mic, MicOff, StopCircle,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const EMOJI_LIST = ["😀","😂","😍","🥰","😎","🤔","👍","👏","🎉","❤️","🔥","💯","✅","📚","🎓","📝","👋","🙏","💪","⭐","😊","🤗","😢","😮","🫡","🤝","🥳","🏆","📖","🧠"];

type SearchMode = "direct" | "group";

// Thin sidebar nav items
const NAV_ITEMS = [
  { id: "home", icon: Home, label: "Inicio", path: "/" },
  { id: "sedetok", icon: Play, label: "Sede Tok", path: "/sedetok" },
  { id: "sede-ai", icon: Sparkles, label: "SEDE AI", path: "/sede-ai" },
  { id: "routes", icon: Map, label: "Rutas", path: "/learning-paths" },
  { id: "courses", icon: BookOpen, label: "Cursos", path: "/courses" },
  { id: "trivia", icon: Gamepad2, label: "Trivia", path: "/trivia-game" },
  { id: "live-games", icon: Radio, label: "Live", path: "/live-games" },
  { id: "achievements", icon: Award, label: "Logros", path: "/achievements" },
  { id: "profile", icon: User, label: "Perfil", path: "/profile" },
  { id: "chat", icon: MessageCircle, label: "Chat", path: "/chat" },
];

const ChatPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const {
    conversations, activeConversation, messages, loadingConversations, loadingMessages, sending,
    openConversation, sendMessage, createDirectConversation, createGroupConversation,
    uploadChatFile, searchUsers, searchInstitutionUsers, setActiveConversation,
    leaveConversation, updateGroupAvatar, getConversationMembers, deleteMessage, playMessageSent,
  } = useChat();
  const { myMembership } = useInstitution();

  const [showSedeAI, setShowSedeAI] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>("direct");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Following users list
  const [followingUsers, setFollowingUsers] = useState<any[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  // Voice message recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Group creation
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Right panel - members
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Leave dialog
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leavingChat, setLeavingChat] = useState(false);

  // Delete message
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);

  // Group avatar upload
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const timer = setTimeout(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) navigate("/auth");
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load users that the current user follows
  const loadFollowingUsers = useCallback(async () => {
    if (!user) return;
    setLoadingFollowing(true);
    try {
      const { data: followsData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .limit(50);
      if (!followsData?.length) { setFollowingUsers([]); return; }
      const ids = followsData.map((f) => f.following_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", ids);
      setFollowingUsers(profiles || []);
    } catch (e) {
      console.error("Error loading following users:", e);
    } finally {
      setLoadingFollowing(false);
    }
  }, [user]);

  useEffect(() => {
    if (showSearch) loadFollowingUsers();
  }, [showSearch, loadFollowingUsers]);

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: "audio/webm" });
        setUploading(true);
        const url = await uploadChatFile(file);
        if (url) await sendMessage("🎤 Mensaje de voz", "audio", url, file.name);
        setUploading(false);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch (e) {
      console.error("No se pudo acceder al micrófono:", e);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    setRecordingSeconds(0);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const results = myMembership?.institution_id
      ? await searchInstitutionUsers(q, myMembership.institution_id)
      : await searchUsers(q);
    setSearchResults(results);
    setSearching(false);
  };

  const handleStartDirectChat = async (userId: string) => {
    await createDirectConversation(userId, myMembership?.institution_id);
    resetSearch();
  };

  const handleToggleMember = (u: any) => {
    setSelectedMembers((prev) =>
      prev.find((m) => m.id === u.id) ? prev.filter((m) => m.id !== u.id) : [...prev, u]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    setCreatingGroup(true);
    await createGroupConversation(groupName.trim(), selectedMembers.map((m) => m.id), myMembership?.institution_id);
    setCreatingGroup(false);
    resetSearch();
  };

  const resetSearch = () => {
    setShowSearch(false); setSearchQuery(""); setSearchResults([]);
    setGroupName(""); setSelectedMembers([]); setSearchMode("direct");
  };

  const handleSend = async () => {
    if (!messageInput.trim()) return;
    const text = messageInput.trim();
    setMessageInput("");
    setShowEmoji(false);
    playMessageSent();
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "file") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadChatFile(file);
    if (url) await sendMessage(type === "image" ? "📷 Imagen" : `📎 ${file.name}`, type === "image" ? "image" : "file", url, file.name);
    setUploading(false);
    e.target.value = "";
  };

  const handleOpenMembers = useCallback(async (convId: string) => {
    setShowMembersPanel(true);
    setLoadingMembers(true);
    const m = await getConversationMembers(convId);
    setMembers(m);
    setLoadingMembers(false);
  }, [getConversationMembers]);

  const handleGroupAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;
    setUpdatingAvatar(true);
    await updateGroupAvatar(activeConversation, file);
    setUpdatingAvatar(false);
    toast({ title: "Foto actualizada" });
    e.target.value = "";
  };

  const handleLeaveChat = async () => {
    if (!activeConversation) return;
    setLeavingChat(true);
    await leaveConversation(activeConversation);
    setLeavingChat(false);
    setShowLeaveDialog(false);
    setShowMembersPanel(false);
  };

  const handleDeleteMessage = async () => {
    if (!deleteMessageId) return;
    setDeletingMessage(true);
    await deleteMessage(deleteMessageId);
    setDeletingMessage(false);
    setDeleteMessageId(null);
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
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
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

  const getRoleBadgeLabel = (role: string) => {
    const map: Record<string, string> = {
      teacher: "Docente", admin: "Admin", coordinator: "Coordinador",
      student: "Estudiante", parent: "Padre",
    };
    return map[role] || role;
  };

  const getMemberRoleLabel = (role: string) => {
    if (role === "admin") return "Admin";
    return "Miembro";
  };

  const currentUserRole = activeConv?.participants?.find(p => p.user_id === user?.id)?.role;
  const isGroupAdmin = currentUserRole === "admin";

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">

      {/* ── Thin nav sidebar (web only) ── */}
      <aside className="hidden md:flex flex-col w-14 shrink-0 border-r border-border bg-card z-10">
        <div className="flex items-center justify-center h-14 border-b border-border">
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">S</span>
          </div>
        </div>
        <nav className="flex-1 flex flex-col items-center gap-1 py-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                title={item.label}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Conversation list ── */}
      <div className={`${activeConversation ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 lg:w-96 border-r border-border bg-card shrink-0`}>
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Chat</h1>
          </div>
          <Button
            variant="ghost" size="icon"
            onClick={() => { setShowSearch(!showSearch); setSearchMode("direct"); setSelectedMembers([]); setGroupName(""); }}
          >
            {showSearch ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </Button>
        </div>

        {/* New Chat / Group Panel */}
        {showSearch && (
          <div className="border-b border-border">
            <div className="flex border-b border-border">
              <button
                onClick={() => { setSearchMode("direct"); setSelectedMembers([]); setSearchQuery(""); setSearchResults([]); }}
                className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${searchMode === "direct" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <MessageCircle className="h-3.5 w-3.5" /> Chat directo
              </button>
              <button
                onClick={() => { setSearchMode("group"); setSearchQuery(""); setSearchResults([]); }}
                className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${searchMode === "group" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Users className="h-3.5 w-3.5" /> Nuevo grupo
              </button>
            </div>

            <div className="p-3 space-y-2">
              {searchMode === "group" && (
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Nombre del grupo..." value={groupName} onChange={(e) => setGroupName(e.target.value)} className="pl-10" />
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchMode === "group" ? "Buscar personas..." : "Buscar usuario..."}
                  value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchMode === "group" && selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedMembers.map((m) => (
                    <span key={m.id} className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                      {m.full_name || m.username}
                      <button onClick={() => handleToggleMember(m)} className="hover:text-destructive ml-0.5"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              {searching && <p className="text-sm text-muted-foreground px-1">Buscando...</p>}
              {searchResults.length === 0 && searchQuery && !searching && (
                <p className="text-sm text-muted-foreground px-1 py-2 text-center">No se encontraron usuarios</p>
              )}
              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {searchResults.map((u) => {
                    const isSelected = selectedMembers.some((m) => m.id === u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => searchMode === "direct" ? handleStartDirectChat(u.id) : handleToggleMember(u)}
                        className={`flex items-center gap-2.5 w-full p-2 rounded-lg transition-colors ${isSelected ? "bg-primary/10" : "hover:bg-muted"}`}
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={u.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(u.full_name || u.username)}</AvatarFallback>
                        </Avatar>
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{u.full_name || u.username}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            @{u.username}
                            {u.member_role && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">{getRoleBadgeLabel(u.member_role)}</Badge>}
                          </p>
                        </div>
                        {searchMode === "group" && isSelected && (
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <CheckCheck className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Following users - shown when no search query and mode is direct */}
              {!searchQuery && searchMode === "direct" && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground px-1 mb-2">Siguiendo</p>
                  {loadingFollowing ? (
                    <div className="space-y-2">
                      {[1,2,3].map((i) => (
                        <div key={i} className="flex items-center gap-2 p-2">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <div className="flex-1 space-y-1">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : followingUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Aún no sigues a nadie</p>
                  ) : (
                    <div className="space-y-0.5 max-h-56 overflow-y-auto">
                      {followingUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => handleStartDirectChat(u.id)}
                          className="flex items-center gap-2.5 w-full p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={u.avatar_url} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(u.full_name || u.username)}</AvatarFallback>
                          </Avatar>
                          <div className="text-left flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{u.full_name || u.username}</p>
                            <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                          </div>
                          <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {searchMode === "group" && (
                <Button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedMembers.length === 0 || creatingGroup} className="w-full" size="sm">
                  <Users className="h-4 w-4 mr-1.5" />
                  {creatingGroup ? "Creando..." : `Crear grupo (${selectedMembers.length})`}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Conversation list */}
        <ScrollArea className="flex-1">
          {/* Sedefy AI - fixed at top */}
          <button
            onClick={() => { setShowSedeAI(true); setActiveConversation(null); }}
            className={`flex items-center gap-3 w-full p-4 hover:bg-muted/50 transition-colors border-b border-border ${showSedeAI ? "bg-primary/5" : ""}`}
          >
            <div className="relative shrink-0">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-card" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-foreground truncate">Sedefy AI</p>
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 shrink-0">IA</Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">Tu asistente de aprendizaje</p>
            </div>
          </button>

          {loadingConversations ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4].map((i) => (
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
              <p className="text-sm text-muted-foreground/70 mt-1">Toca el botón + para iniciar un chat</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => { openConversation(conv.id); setShowSedeAI(false); }}
                  className={`flex items-center gap-3 w-full p-4 hover:bg-muted/50 transition-colors ${activeConversation === conv.id ? "bg-primary/5" : ""}`}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getConvAvatar(conv) || undefined} />
                      <AvatarFallback className={`${conv.type === "group" ? "bg-secondary/20 text-secondary" : "bg-primary/10 text-primary"} text-sm`}>
                        {conv.type === "group" ? <Users className="h-5 w-5" /> : getInitials(getConvName(conv))}
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
                      <p className="text-sm font-semibold text-foreground truncate">{getConvName(conv)}</p>
                      {conv.last_message && (
                        <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">{formatConvTime(conv.last_message.created_at)}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {conv.last_message?.content || (conv.type === "group" ? `${conv.participants?.length || 0} participantes` : "Sin mensajes")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── Main Chat Area ── */}
      <div className={`${(activeConversation || showSedeAI) ? "flex" : "hidden md:flex"} flex-col flex-1 bg-background min-w-0`}>
        {showSedeAI ? (
          <div className="flex flex-col h-full">
            {/* AI chat header */}
            <div className="h-14 px-3 border-b border-border flex items-center gap-3 bg-card shrink-0">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowSedeAI(false)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Sedefy AI</p>
                <p className="text-xs text-muted-foreground">Tu asistente educativo inteligente</p>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <SedeAIChat embedded={true} />
            </div>
          </div>
        ) : !activeConversation ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="bg-primary/5 rounded-full p-6 mb-4">
              <MessageCircle className="h-16 w-16 text-primary/40" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Bienvenido al Chat</h2>
            <p className="text-muted-foreground max-w-md">Selecciona una conversación o usa el botón + para iniciar un chat</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-14 px-3 border-b border-border flex items-center gap-3 bg-card shrink-0">
              <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setActiveConversation(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>

              {/* Avatar - clickable to open members for groups */}
              <div
                className={`relative shrink-0 ${activeConv?.type === "group" ? "cursor-pointer" : ""}`}
                onClick={() => activeConv?.type === "group" && handleOpenMembers(activeConversation)}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={getConvAvatar(activeConv!) || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {activeConv?.type === "group" ? <Users className="h-4 w-4" /> : getInitials(getConvName(activeConv!))}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate text-sm">{getConvName(activeConv!)}</p>
                {activeConv?.type === "group" && (
                  <p className="text-xs text-muted-foreground">{activeConv.participants?.length || 0} participantes</p>
                )}
              </div>

              {/* Header actions */}
              <div className="flex items-center gap-1 shrink-0">
                {activeConv?.type === "group" && (
                  <Button variant="ghost" size="icon" onClick={() => handleOpenMembers(activeConversation)} title="Ver miembros">
                    <Users className="h-4 w-4" />
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {activeConv?.type === "group" && (
                      <>
                        <DropdownMenuItem onClick={() => handleOpenMembers(activeConversation)}>
                          <Users className="h-4 w-4 mr-2" /> Ver miembros
                        </DropdownMenuItem>
                        {isGroupAdmin && (
                          <DropdownMenuItem onClick={() => groupAvatarInputRef.current?.click()}>
                            <Camera className="h-4 w-4 mr-2" />
                            {updatingAvatar ? "Actualizando..." : "Cambiar foto del grupo"}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setShowLeaveDialog(true)}
                    >
                      <LogOut className="h-4 w-4 mr-2" /> Salir del chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-2">
              {loadingMessages ? (
                <div className="space-y-4 py-4">
                  {[1,2,3].map((i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : ""}`}>
                      <Skeleton className="h-12 w-48 rounded-2xl" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-6">
                  {/* Avatar of the other person */}
                  {activeConv?.type === "direct" && (() => {
                    const other = activeConv.participants?.find(p => p.user_id !== user?.id);
                    return (
                      <div className="flex flex-col items-center gap-3 mb-6">
                        <Avatar className="h-20 w-20 ring-4 ring-border">
                          <AvatarImage src={other?.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                            {getInitials(other?.profile?.full_name || other?.profile?.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                          <p className="font-semibold text-foreground text-lg">{other?.profile?.full_name || other?.profile?.username}</p>
                          <p className="text-sm text-muted-foreground">@{other?.profile?.username}</p>
                        </div>
                      </div>
                    );
                  })()}
                  {activeConv?.type === "group" && (
                    <div className="flex flex-col items-center gap-3 mb-6">
                      <Avatar className="h-20 w-20 ring-4 ring-border">
                        <AvatarImage src={getConvAvatar(activeConv!) || undefined} />
                        <AvatarFallback className="bg-secondary/20 text-secondary"><Users className="h-8 w-8" /></AvatarFallback>
                      </Avatar>
                      <div className="text-center">
                        <p className="font-semibold text-foreground text-lg">{getConvName(activeConv!)}</p>
                        <p className="text-sm text-muted-foreground">{activeConv.participants?.length || 0} participantes</p>
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Aún no hay mensajes. ¡Sé el primero en escribir! 👋
                  </p>
                  {/* Suggested messages */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {["👋 ¡Hola!", "😊 ¿Cómo estás?", "📚 ¿Estudiamos juntos?", "🎉 ¡Me alegra conectar!"].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => { setMessageInput(suggestion); }}
                        className="text-sm bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-full border border-border transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-1 py-2">
                  {messages.map((msg, idx) => {
                    const isMine = msg.sender_id === user?.id;
                    const showSender = activeConv?.type === "group" && !isMine &&
                      (idx === 0 || messages[idx - 1].sender_id !== msg.sender_id);
                    const isHovered = hoveredMessageId === msg.id;
                    return (
                      <div key={msg.id}>
                        {showSender && (
                          <p className="text-[11px] text-muted-foreground ml-2 mt-2 mb-0.5 font-medium">
                            {msg.sender?.full_name || msg.sender?.username}
                          </p>
                        )}
                        <div
                          className={`flex items-end gap-1.5 ${isMine ? "justify-end" : "justify-start"}`}
                          onMouseEnter={() => setHoveredMessageId(msg.id)}
                          onMouseLeave={() => setHoveredMessageId(null)}
                        >
                          {/* Delete button - left side for own msgs */}
                          {isMine && isHovered && (
                            <button
                              onClick={() => setDeleteMessageId(msg.id)}
                              className="mb-1 p-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                              style={{ opacity: isHovered ? 1 : 0 }}
                              title="Eliminar mensaje"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                            {msg.message_type === "image" && msg.file_url && (
                              <img src={msg.file_url} alt="Imagen" className="rounded-lg max-w-full max-h-60 mb-1 cursor-pointer" onClick={() => window.open(msg.file_url!, "_blank")} />
                            )}
                            {msg.message_type === "file" && msg.file_url && (
                              <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline text-sm">
                                <Paperclip className="h-3 w-3" />{msg.file_name || "Archivo"}
                              </a>
                            )}
                            {msg.message_type === "audio" && msg.file_url && (
                              <div className="flex items-center gap-2 py-1 min-w-[160px]">
                                <Mic className="h-4 w-4 shrink-0 opacity-70" />
                                <audio controls className="h-8 flex-1" style={{ minWidth: 0 }}>
                                  <source src={msg.file_url} type="audio/webm" />
                                </audio>
                              </div>
                            )}
                            {msg.message_type !== "audio" && msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                            <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : ""}`}>
                              <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                {formatMsgTime(msg.created_at)}
                              </span>
                              {isMine && <CheckCheck className="h-3 w-3 text-primary-foreground/60" />}
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

            {/* Emoji picker */}
            {showEmoji && (
              <div className="border-t border-border p-2 bg-card flex flex-wrap gap-1.5 max-h-32 overflow-y-auto shrink-0">
                {EMOJI_LIST.map((e) => (
                  <button key={e} onClick={() => setMessageInput((prev) => prev + e)} className="text-xl hover:scale-110 transition-transform">{e}</button>
                ))}
              </div>
            )}

            {/* Input bar */}
            <div className="p-3 border-t border-border bg-card shrink-0">
              <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileUpload(e, "file")} />
              <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "image")} />
              <input type="file" ref={groupAvatarInputRef} accept="image/*" className="hidden" onChange={handleGroupAvatarChange} />

              {/* Recording indicator */}
              {isRecording && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-sm text-destructive font-medium">{formatRecordingTime(recordingSeconds)}</span>
                  <span className="text-xs text-muted-foreground">Grabando voz...</span>
                  <button onClick={cancelRecording} className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <X className="h-3 w-3" /> Cancelar
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2">
                {!isRecording && (
                  <>
                    <Button variant="ghost" size="icon" className="shrink-0 self-end" onClick={() => setShowEmoji(!showEmoji)}>
                      <Smile className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="shrink-0 self-end" onClick={() => imageInputRef.current?.click()}>
                      <ImageIcon className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="shrink-0 self-end" onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Escribe un mensaje..."
                      rows={1}
                      className="flex-1 resize-none bg-muted rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary max-h-32 overflow-y-auto"
                      style={{ lineHeight: "1.4" }}
                    />
                  </>
                )}

                {isRecording && (
                  <div className="flex-1 bg-muted rounded-2xl px-4 py-2.5 flex items-center gap-2">
                    <div className="flex gap-1 items-center">
                      {[1,2,3,4,5].map((i) => (
                        <div key={i} className="w-1 bg-primary rounded-full animate-bounce" style={{ height: `${8 + (i % 3) * 4}px`, animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">Grabando...</span>
                  </div>
                )}

                {messageInput.trim() || isRecording ? (
                  isRecording ? (
                    <Button onClick={stopRecording} size="icon" className="shrink-0 self-end rounded-full bg-destructive hover:bg-destructive/90">
                      <StopCircle className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button onClick={handleSend} disabled={!messageInput.trim() || sending} size="icon" className="shrink-0 self-end rounded-full">
                      <Send className="h-4 w-4" />
                    </Button>
                  )
                ) : (
                  <Button
                    variant="ghost" size="icon"
                    className={`shrink-0 self-end rounded-full ${uploading ? "opacity-50" : ""}`}
                    onClick={startRecording}
                    disabled={uploading}
                    title="Grabar mensaje de voz"
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Members Sheet (panel lateral derecho) ── */}
      <Sheet open={showMembersPanel} onOpenChange={setShowMembersPanel}>
        <SheetContent side="right" className="w-80 p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="text-left">Miembros del grupo</SheetTitle>
          </SheetHeader>

          {/* Group info section */}
          {activeConv?.type === "group" && (
            <div className="p-4 border-b border-border flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={getConvAvatar(activeConv!) || undefined} />
                  <AvatarFallback className="bg-secondary/20 text-secondary text-xl">
                    <Users className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                {isGroupAdmin && (
                  <button
                    onClick={() => groupAvatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md hover:bg-primary/90 transition-colors"
                    title="Cambiar foto"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">{getConvName(activeConv!)}</p>
                <p className="text-xs text-muted-foreground">{members.length} miembros</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => { setShowMembersPanel(false); setShowLeaveDialog(true); }}
              >
                <LogOut className="h-4 w-4 mr-2" /> Salir del grupo
              </Button>
            </div>
          )}

          {/* Member list */}
          <ScrollArea className="flex-1">
            {loadingMembers ? (
              <div className="p-4 space-y-3">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 space-y-0.5">
                {members.map((member) => {
                  const isMe = member.user_id === user?.id;
                  return (
                    <div key={member.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={member.profile?.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(member.profile?.full_name || member.profile?.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-snug break-words">
                          {member.profile?.full_name || member.profile?.username || "Usuario"}
                          {isMe && <span className="text-muted-foreground font-normal"> (tú)</span>}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {member.role === "admin" && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Admin</Badge>
                          )}
                          {member.profile?.tipo_usuario && (
                            <span className="text-[10px] text-muted-foreground">{getRoleBadgeLabel(member.profile.tipo_usuario)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ── Leave confirmation dialog ── */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir del chat?</AlertDialogTitle>
            <AlertDialogDescription>
              Ya no podrás ver ni enviar mensajes en esta conversación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leavingChat}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveChat}
              disabled={leavingChat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {leavingChat ? "Saliendo..." : "Salir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* ── Delete message confirmation dialog ── */}
      <AlertDialog open={!!deleteMessageId} onOpenChange={(open) => !open && setDeleteMessageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar mensaje?</AlertDialogTitle>
            <AlertDialogDescription>
              El mensaje será eliminado y ya no podrá verse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingMessage}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMessage}
              disabled={deletingMessage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingMessage ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatPage;
