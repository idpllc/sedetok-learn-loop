import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { useChatSounds } from "./useChatSounds";

export interface ChatConversation {
  id: string;
  type: "direct" | "group";
  name: string | null;
  institution_id: string | null;
  academic_group_id: string | null;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  participants?: ChatParticipant[];
  last_message?: ChatMessage | null;
  unread_count?: number;
}

export interface ChatParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  last_read_at: string;
  muted: boolean;
  profile?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  sender?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  reply_to?: ChatMessage | null;
}

export const useChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { playMessageReceived, playMessageSent } = useChatSounds();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<any>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConversations(true);
    try {
      // Get conversations where user is participant
      const { data: participantData } = await supabase
        .from("chat_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id);

      if (!participantData?.length) {
        setConversations([]);
        setLoadingConversations(false);
        return;
      }

      const convIds = participantData.map((p) => p.conversation_id);
      const lastReadMap = Object.fromEntries(
        participantData.map((p) => [p.conversation_id, p.last_read_at])
      );

      const { data: convData } = await supabase
        .from("chat_conversations")
        .select("*")
        .in("id", convIds)
        .order("updated_at", { ascending: false });

      if (!convData) {
        setConversations([]);
        setLoadingConversations(false);
        return;
      }

      // Get participants for each conversation
      const { data: allParticipants } = await supabase
        .from("chat_participants")
        .select("*")
        .in("conversation_id", convIds);

      // Get profiles for participants
      const userIds = [...new Set((allParticipants || []).map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = Object.fromEntries(
        (profiles || []).map((p) => [p.id, p])
      );

      // Get last message for each conversation
      const enrichedConvs: ChatConversation[] = await Promise.all(
        convData.map(async (conv) => {
          const { data: lastMsg } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("conversation_id", conv.id)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          const { count } = await supabase
            .from("chat_messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .is("deleted_at", null)
            .gt("created_at", lastReadMap[conv.id] || "1970-01-01");

          const convParticipants = (allParticipants || [])
            .filter((p) => p.conversation_id === conv.id)
            .map((p) => ({
              ...p,
              profile: profileMap[p.user_id],
            }));

          // For direct conversations, use other person's name
          let displayName = conv.name;
          if (conv.type === "direct" && !displayName) {
            const other = convParticipants.find((p) => p.user_id !== user.id);
            displayName = other?.profile?.full_name || other?.profile?.username || "Chat";
          }

          return {
            ...conv,
            name: displayName,
            participants: convParticipants,
            last_message: lastMsg,
            unread_count: count || 0,
          } as ChatConversation;
        })
      );

      setConversations(enrichedConvs);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user) return;
    setLoadingMessages(true);
    try {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(100);

      if (!data) {
        setMessages([]);
        setLoadingMessages(false);
        return;
      }

      // Get sender profiles
      const senderIds = [...new Set(data.map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", senderIds);

      const profileMap = Object.fromEntries(
        (profiles || []).map((p) => [p.id, p])
      );

      const enriched = data.map((m) => ({
        ...m,
        sender: profileMap[m.sender_id],
      })) as ChatMessage[];

      setMessages(enriched);

      // Mark as read
      await supabase
        .from("chat_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, [user]);

  // Open conversation
  const openConversation = useCallback((conversationId: string) => {
    setActiveConversation(conversationId);
    fetchMessages(conversationId);
  }, [fetchMessages]);

  // Send message
  const sendMessage = useCallback(async (content: string, messageType = "text", fileUrl?: string, fileName?: string, replyToId?: string) => {
    if (!user || !activeConversation) return;
    setSending(true);
    try {
      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: activeConversation,
        sender_id: user.id,
        content,
        message_type: messageType,
        file_url: fileUrl || null,
        file_name: fileName || null,
        reply_to_id: replyToId || null,
      });

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeConversation);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }, [user, activeConversation, toast]);

  // Create direct conversation
  const createDirectConversation = useCallback(async (otherUserId: string, institutionId?: string) => {
    if (!user) return null;
    try {
      // Check if direct conversation already exists
      const { data: myConvs } = await supabase
        .from("chat_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      const { data: theirConvs } = await supabase
        .from("chat_participants")
        .select("conversation_id")
        .eq("user_id", otherUserId);

      if (myConvs && theirConvs) {
        const myIds = new Set(myConvs.map((c) => c.conversation_id));
        const commonIds = theirConvs
          .map((c) => c.conversation_id)
          .filter((id) => myIds.has(id));

        if (commonIds.length > 0) {
          const { data: existing } = await supabase
            .from("chat_conversations")
            .select("*")
            .in("id", commonIds)
            .eq("type", "direct")
            .limit(1)
            .single();

          if (existing) {
            openConversation(existing.id);
            return existing.id;
          }
        }
      }

      // Create new conversation
      const { data: conv, error } = await supabase
        .from("chat_conversations")
        .insert({
          type: "direct",
          institution_id: institutionId || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add both participants
      await supabase.from("chat_participants").insert([
        { conversation_id: conv.id, user_id: user.id, role: "member" },
        { conversation_id: conv.id, user_id: otherUserId, role: "member" },
      ]);

      await fetchConversations();
      openConversation(conv.id);
      return conv.id;
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la conversación",
        variant: "destructive",
      });
      return null;
    }
  }, [user, openConversation, fetchConversations, toast]);

  // Create group conversation
  const createGroupConversation = useCallback(async (name: string, memberIds: string[], institutionId?: string) => {
    if (!user) return null;
    try {
      const { data: conv, error } = await supabase
        .from("chat_conversations")
        .insert({
          type: "group",
          name,
          institution_id: institutionId || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const participants = [user.id, ...memberIds].map((uid) => ({
        conversation_id: conv.id,
        user_id: uid,
        role: uid === user.id ? "admin" : "member",
      }));

      await supabase.from("chat_participants").insert(participants);

      await fetchConversations();
      openConversation(conv.id);
      return conv.id;
    } catch (error) {
      console.error("Error creating group:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el grupo",
        variant: "destructive",
      });
      return null;
    }
  }, [user, openConversation, fetchConversations, toast]);

  // Upload file for chat
  const uploadChatFile = useCallback(async (file: File): Promise<string | null> => {
    try {
      const ext = file.name.split(".").pop();
      const path = `${user?.id}/${Date.now()}.${ext}`;
      
      const { error } = await supabase.storage
        .from("chat-files")
        .upload(path, file);

      if (error) throw error;

      const { data } = supabase.storage
        .from("chat-files")
        .getPublicUrl(path);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "No se pudo subir el archivo",
        variant: "destructive",
      });
      return null;
    }
  }, [user, toast]);

  // Search users
  const searchUsers = useCallback(async (query: string, institutionId?: string) => {
    if (!query.trim()) return [];
    try {
      let q = supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, institution")
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .neq("id", user?.id || "")
        .limit(20);

      const { data } = await q;
      return data || [];
    } catch (error) {
      console.error("Error searching users:", error);
      return [];
    }
  }, [user]);

  // Leave conversation
  const leaveConversation = useCallback(async (conversationId: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from("chat_participants")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
      if (error) throw error;
      setActiveConversation(null);
      await fetchConversations();
      toast({ title: "Saliste del chat" });
      return true;
    } catch (error) {
      console.error("Error leaving conversation:", error);
      toast({ title: "Error", description: "No se pudo salir del chat", variant: "destructive" });
      return false;
    }
  }, [user, fetchConversations, toast]);

  // Update group avatar
  const updateGroupAvatar = useCallback(async (conversationId: string, file: File): Promise<string | null> => {
    try {
      const ext = file.name.split(".").pop();
      const path = `group-avatars/${conversationId}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("chat-files").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("chat-files").getPublicUrl(path);
      const avatarUrl = data.publicUrl;
      await supabase.from("chat_conversations").update({ avatar_url: avatarUrl }).eq("id", conversationId);
      await fetchConversations();
      return avatarUrl;
    } catch (error) {
      console.error("Error updating group avatar:", error);
      toast({ title: "Error", description: "No se pudo actualizar la foto", variant: "destructive" });
      return null;
    }
  }, [fetchConversations, toast]);

  // Get conversation members with profiles and roles
  const getConversationMembers = useCallback(async (conversationId: string) => {
    try {
      const { data: participants } = await supabase
        .from("chat_participants")
        .select("*")
        .eq("conversation_id", conversationId);
      if (!participants?.length) return [];
      const userIds = participants.map((p) => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, tipo_usuario")
        .in("id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
      return participants.map((p) => ({ ...p, profile: profileMap[p.user_id] }));
    } catch (error) {
      console.error("Error getting members:", error);
      return [];
    }
  }, []);

  // Search institution users
  const searchInstitutionUsers = useCallback(async (query: string, institutionId: string) => {
    if (!institutionId) return [];
    try {
      const { data: members } = await supabase
        .from("institution_members")
        .select("user_id, member_role")
        .eq("institution_id", institutionId)
        .eq("status", "active");

      if (!members?.length) return [];
      const memberIds = members.map((m) => m.user_id).filter((id) => id !== user?.id);

      let q = supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", memberIds);

      if (query.trim()) {
        q = q.or(`username.ilike.%${query}%,full_name.ilike.%${query}%`);
      }

      const { data } = await q.limit(30);

      const roleMap = Object.fromEntries(members.map((m) => [m.user_id, m.member_role]));
      return (data || []).map((p) => ({ ...p, member_role: roleMap[p.id] }));
    } catch (error) {
      console.error("Error searching institution users:", error);
      return [];
    }
  }, [user]);

  // Delete message (soft delete)
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from("chat_messages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", messageId)
        .eq("sender_id", user.id);
      if (error) throw error;
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      return true;
    } catch (error) {
      console.error("Error deleting message:", error);
      return false;
    }
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !activeConversation) return;

    channelRef.current = supabase
      .channel(`chat-${activeConversation}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${activeConversation}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          // Get sender profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .eq("id", newMsg.sender_id)
            .single();

          setMessages((prev) => [
            ...prev,
            { ...newMsg, sender: profile || undefined } as ChatMessage,
          ]);

          // Play sound and mark as read only for messages from others
          if (newMsg.sender_id !== user.id) {
            playMessageReceived();
            await supabase
              .from("chat_participants")
              .update({ last_read_at: new Date().toISOString() })
              .eq("conversation_id", activeConversation)
              .eq("user_id", user.id);
          }
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [user, activeConversation]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    activeConversation,
    messages,
    loadingConversations,
    loadingMessages,
    sending,
    openConversation,
    sendMessage,
    createDirectConversation,
    createGroupConversation,
    uploadChatFile,
    searchUsers,
    searchInstitutionUsers,
    fetchConversations,
    setActiveConversation,
    leaveConversation,
    updateGroupAvatar,
    getConversationMembers,
    deleteMessage,
    playMessageSent,
  };
};
