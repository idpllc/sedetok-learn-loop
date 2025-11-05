import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export const useSedeAIChat = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("ai_chat_conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading conversations:", error);
      return;
    }

    setConversations(data || []);
  }, [user]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from("ai_chat_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    const typedMessages: Message[] = (data || []).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content
    }));
    setMessages(typedMessages);
  }, []);

  // Create new conversation
  const createConversation = useCallback(async (firstMessage: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("ai_chat_conversations")
      .insert({
        user_id: user.id,
        title: firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : ""),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la conversación",
        variant: "destructive",
      });
      return null;
    }

    return data;
  }, [user, toast]);

  // Save message to database
  const saveMessage = useCallback(async (conversationId: string, role: "user" | "assistant", content: string) => {
    const { error } = await supabase
      .from("ai_chat_messages")
      .insert({
        conversation_id: conversationId,
        role,
        content,
      });

    if (error) {
      console.error("Error saving message:", error);
    }

    // Update conversation updated_at
    await supabase
      .from("ai_chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }, []);

  // Send message with streaming
  const sendMessage = useCallback(async (message: string) => {
    if (!user || !message.trim()) return;

    let conversationId = currentConversationId;

    // Create new conversation if needed
    if (!conversationId) {
      const newConversation = await createConversation(message);
      if (!newConversation) return;
      conversationId = newConversation.id;
      setCurrentConversationId(conversationId);
      setConversations(prev => [newConversation, ...prev]);
    }

    // Add user message
    const userMessage: Message = { role: "user", content: message };
    setMessages(prev => [...prev, userMessage]);
    await saveMessage(conversationId, "user", message);

    setIsStreaming(true);
    setIsLoading(true);

    try {
      if (!session?.access_token) {
        toast({
          title: "Sesión requerida",
          description: "Inicia sesión para usar SEDE AI",
          variant: "destructive",
        });
        return;
      }

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sede-ai-chat`;
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        },
        body: JSON.stringify({
          message,
          conversationId,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";

      // Add empty assistant message that we'll update
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              // Update the last message (assistant)
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save complete assistant message
      if (assistantContent) {
        await saveMessage(conversationId, "assistant", assistantContent);
      }

      await loadConversations();
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive",
      });
      // Remove the empty assistant message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, [user, currentConversationId, createConversation, saveMessage, loadConversations, toast]);

  // Select conversation
  const selectConversation = useCallback((conversationId: string | null) => {
    setCurrentConversationId(conversationId);
    if (conversationId) {
      loadMessages(conversationId);
    } else {
      setMessages([]);
    }
  }, [loadMessages]);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    const { error } = await supabase
      .from("ai_chat_conversations")
      .delete()
      .eq("id", conversationId);

    if (error) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la conversación",
        variant: "destructive",
      });
      return;
    }

    if (currentConversationId === conversationId) {
      setCurrentConversationId(null);
      setMessages([]);
    }

    await loadConversations();
    toast({
      title: "Conversación eliminada",
      description: "La conversación ha sido eliminada exitosamente",
    });
  }, [currentConversationId, loadConversations, toast]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    messages,
    isLoading,
    isStreaming,
    currentConversationId,
    sendMessage,
    selectConversation,
    deleteConversation,
    loadConversations,
  };
};