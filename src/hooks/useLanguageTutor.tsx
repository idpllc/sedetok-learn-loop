import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Assessment = {
  level: string;
  strengths: string[];
  weaknesses: string[];
  skill_scores?: Array<{ skill: string; level: string; score: number }>;
} | null;

type LanguageAssessment = {
  current_level: string | null;
  previous_level: string | null;
  assessed_at: string | null;
};

export const useLanguageTutor = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [assessment, setAssessment] = useState<LanguageAssessment | null>(null);
  const [latestResult, setLatestResult] = useState<Assessment>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Load user's current assessment
  const loadAssessment = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('language_assessments')
      .select('current_level, previous_level, assessed_at')
      .eq('user_id', user.id)
      .single();
    if (data) setAssessment(data);
  }, [user]);

  // Load conversations (language tutor ones)
  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .eq('user_id', user.id)
      .ilike('title', '%[ALEX]%')
      .order('updated_at', { ascending: false });
    setConversations(data || []);
  }, [user]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data } = await supabase
      .from('ai_chat_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMessages((data || []).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content
    })));
  }, []);

  const createConversation = useCallback(async (firstMessage: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('ai_chat_conversations')
      .insert({
        user_id: user.id,
        title: `[LINGUA] ${firstMessage.slice(0, 40)}...`,
      })
      .select()
      .single();
    if (error) return null;
    setCurrentConversationId(data.id);
    setConversations(prev => [data, ...prev]);
    return data.id;
  }, [user]);

  const selectConversation = useCallback(async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    await loadMessages(conversationId);
  }, [loadMessages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !content.trim()) return;
    setIsLoading(true);

    try {
      let convId = currentConversationId;
      if (!convId) {
        convId = await createConversation(content);
        if (!convId) throw new Error('Failed to create conversation');
      }

      const userMessage: Message = { role: "user", content };
      setMessages(prev => [...prev, userMessage]);

      // Save user message
      await supabase.from('ai_chat_messages').insert({
        conversation_id: convId,
        role: 'user',
        content,
      });

      // Call the language tutor edge function
      const { data, error } = await supabase.functions.invoke('language-tutor-chat', {
        body: {
          message: content,
          conversationId: convId,
          sessionId,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message
      await supabase.from('ai_chat_messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: data.message,
      });

      // If assessment was made, update local state
      if (data.assessment) {
        setLatestResult(data.assessment);
        setAssessment({
          current_level: data.assessment.level,
          previous_level: assessment?.current_level || null,
          assessed_at: new Date().toISOString(),
        });
      }

      // Update conversation timestamp
      await supabase.from('ai_chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId);

    } catch (err: any) {
      console.error('Language tutor error:', err);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, currentConversationId, createConversation, sessionId, assessment, toast]);

  const startNewChat = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
    setLatestResult(null);
    setSessionId(null);
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    await supabase.from('ai_chat_messages').delete().eq('conversation_id', conversationId);
    await supabase.from('ai_chat_conversations').delete().eq('id', conversationId);
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    if (currentConversationId === conversationId) {
      startNewChat();
    }
  }, [currentConversationId, startNewChat]);

  useEffect(() => {
    loadConversations();
    loadAssessment();
  }, [loadConversations, loadAssessment]);

  return {
    conversations,
    currentConversationId,
    messages,
    isLoading,
    assessment,
    latestResult,
    sendMessage,
    selectConversation,
    startNewChat,
    deleteConversation,
    loadConversations,
  };
};
