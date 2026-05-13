import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TriviaTopic = {
  id: string;
  topic_key: string;
  title: string;
  subject: string | null;
  description: string | null;
};

export type TriviaRoom = {
  id: string;
  topic_key: string;
  notebook_id: string | null;
  host_user_id: string;
  status: "waiting" | "in_progress" | "finished";
  current_question: number;
  question_started_at: string | null;
  max_players: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

export type TriviaPlayer = {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  score: number;
  correct_count: number;
  joined_at: string;
};

export type TriviaQuestion = {
  position: number;
  question: string;
  options: string[];
};

async function invoke(body: any) {
  const { data, error } = await supabase.functions.invoke("notebook-trivia", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useNotebookTrivia(notebookId: string | undefined) {
  const [resolving, setResolving] = useState(false);
  const [topic, setTopic] = useState<TriviaTopic | null>(null);
  const [room, setRoom] = useState<TriviaRoom | null>(null);
  const [players, setPlayers] = useState<TriviaPlayer[]>([]);
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);

  // Subscribe to room + players + answers when room exists
  useEffect(() => {
    if (!room?.id) return;
    const ch = supabase
      .channel(`trivia-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notebook_trivia_rooms", filter: `id=eq.${room.id}` }, (payload) => {
        if (payload.new) setRoom(payload.new as any);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notebook_trivia_room_players", filter: `room_id=eq.${room.id}` }, async () => {
        const { data } = await supabase
          .from("notebook_trivia_room_players")
          .select("*")
          .eq("room_id", room.id)
          .order("joined_at");
        setPlayers((data as any) || []);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [room?.id]);

  // Polling fallback in case realtime is slow
  useEffect(() => {
    if (!room?.id) return;
    const t = setInterval(async () => {
      const { data: r } = await supabase.from("notebook_trivia_rooms").select("*").eq("id", room.id).maybeSingle();
      if (r) setRoom(r as any);
      const { data: p } = await supabase
        .from("notebook_trivia_room_players")
        .select("*")
        .eq("room_id", room.id)
        .order("joined_at");
      setPlayers((p as any) || []);
    }, 2500);
    return () => clearInterval(t);
  }, [room?.id]);

  const start = useCallback(async () => {
    if (!notebookId) return;
    setResolving(true);
    try {
      const { topic } = await invoke({ action: "resolve_topic", notebookId });
      setTopic(topic);
      const join = await invoke({ action: "join_or_create", topicKey: topic.topic_key, notebookId });
      setRoom(join.room);
      setPlayers(join.players || []);
      const qs = await invoke({ action: "get_questions", roomId: join.room.id });
      setQuestions(qs.questions || []);
    } catch (e: any) {
      toast.error("No se pudo iniciar la trivia", { description: String(e?.message || e) });
    } finally {
      setResolving(false);
    }
  }, [notebookId]);

  const leave = useCallback(async () => {
    if (!room?.id) return;
    try {
      await invoke({ action: "leave", roomId: room.id });
    } catch {}
    setRoom(null);
    setPlayers([]);
    setQuestions([]);
    setTopic(null);
  }, [room?.id]);

  const startGame = useCallback(async () => {
    if (!room?.id) return;
    try {
      const { room: r } = await invoke({ action: "start", roomId: room.id });
      setRoom(r);
    } catch (e: any) {
      toast.error("No se pudo iniciar", { description: String(e?.message || e) });
    }
  }, [room?.id]);

  const nextQuestion = useCallback(async () => {
    if (!room?.id) return;
    try {
      const { room: r } = await invoke({ action: "next_question", roomId: room.id });
      setRoom(r);
    } catch {}
  }, [room?.id]);

  const submitAnswer = useCallback(
    async (position: number, selectedIndex: number, timeMs: number) => {
      if (!room?.id) return null;
      try {
        return await invoke({ action: "submit_answer", roomId: room.id, position, selectedIndex, timeMs });
      } catch (e: any) {
        return null;
      }
    },
    [room?.id]
  );

  return {
    resolving,
    topic,
    room,
    players,
    questions,
    start,
    leave,
    startGame,
    nextQuestion,
    submitAnswer,
  };
}
