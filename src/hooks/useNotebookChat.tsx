import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * Chat hook scoped to a specific notebook. Each notebook has at most one
 * conversation that is auto-created on first message. Reuses sede-ai-chat
 * edge function with notebookId to inject source context.
 */
export const useNotebookChat = (notebookId: string | undefined) => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // Load or create the notebook conversation
  useEffect(() => {
    if (!user || !notebookId) return;
    let cancelled = false;
    (async () => {
      const { data: existing } = await supabase
        .from("ai_chat_conversations")
        .select("id")
        .eq("user_id", user.id)
        .eq("notebook_id", notebookId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let convId = existing?.id || null;
      if (!convId) {
        const { data: created } = await supabase
          .from("ai_chat_conversations")
          .insert({ user_id: user.id, notebook_id: notebookId, title: "Conversación" })
          .select("id")
          .single();
        convId = created?.id || null;
      }
      if (cancelled || !convId) return;
      setConversationId(convId);

      const { data: msgs } = await supabase
        .from("ai_chat_messages")
        .select("role, content")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });
      if (!cancelled) {
        setMessages((msgs || []).map((m: any) => ({ role: m.role, content: m.content })));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, notebookId]);

  const sendMessage = useCallback(
    async (text: string, studioType?: string) => {
      if (!user || !notebookId || !conversationId || !text.trim() || !session?.access_token) return;
      setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);
      setIsStreaming(true);

      // Persist user message
      await supabase.from("ai_chat_messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: text,
      });

      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sede-ai-chat`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
          },
          body: JSON.stringify({ message: text, conversationId, notebookId }),
        });

        if (!res.ok || !res.body) throw new Error("Stream failed");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistant = "";
        let done = false;
        while (!done) {
          const { done: d, value } = await reader.read();
          if (d) break;
          buffer += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              done = true;
              break;
            }
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                assistant += delta;
                setMessages((prev) => {
                  const arr = [...prev];
                  arr[arr.length - 1] = { role: "assistant", content: assistant };
                  return arr;
                });
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }

        if (assistant) {
          // Append Studio CTA marker so UI can render "Crear nueva cápsula" button
          if (studioType) {
            const cta = `\n\n|||STUDIO_CTA:${JSON.stringify({ type: studioType })}|||`;
            assistant += cta;
            setMessages((prev) => {
              const arr = [...prev];
              arr[arr.length - 1] = { role: "assistant", content: assistant };
              return arr;
            });
          }
          await supabase.from("ai_chat_messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: assistant,
          });
        }
      } catch (e: any) {
        console.error(e);
        toast({ title: "Error", description: "No se pudo enviar el mensaje", variant: "destructive" });
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsStreaming(false);
      }
    },
    [user, session, conversationId, notebookId, toast]
  );

  /**
   * Append a synthetic assistant/user message pair without hitting the AI.
   * Used for Studio "Estoy buscando..." flow and "no results" notices.
   */
  const appendLocal = useCallback(
    async (userText: string, assistantText: string) => {
      if (!conversationId) return;
      setMessages((prev) => [
        ...prev,
        { role: "user", content: userText },
        { role: "assistant", content: assistantText },
      ]);
      await supabase.from("ai_chat_messages").insert([
        { conversation_id: conversationId, role: "user", content: userText },
        { conversation_id: conversationId, role: "assistant", content: assistantText },
      ]);
    },
    [conversationId]
  );

  return { messages, sendMessage, isStreaming, conversationId, appendLocal };
};
