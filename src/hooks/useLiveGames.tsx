import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { useEffect } from "react";

type GradeLevel = Database['public']['Enums']['grade_level'];

export interface LiveGame {
  id: string;
  creator_id: string;
  quiz_id?: string;
  game_id?: string;
  pin: string;
  title: string;
  status: 'waiting' | 'in_progress' | 'finished';
  current_question_index: number;
  started_at?: string;
  finished_at?: string;
  created_at: string;
  institution_id?: string;
  subject?: string;
  grade_level?: GradeLevel;
}

export interface LiveGamePlayer {
  id: string;
  game_id: string;
  user_id?: string;
  player_name: string;
  total_score: number;
  joined_at: string;
}

export interface LiveGameQuestion {
  id: string;
  game_id: string;
  question_text: string;
  question_type: string;
  options: Array<{ text: string; image_url?: string }>;
  correct_answer: number;
  points: number;
  time_limit: number;
  order_index: number;
  image_url?: string;
  video_url?: string;
  feedback?: string;
  created_at?: string;
}

export interface LiveGameAnswer {
  id: string;
  player_id: string;
  question_id: string;
  selected_answer: number;
  is_correct: boolean;
  response_time_ms: number;
  points_earned: number;
  answered_at: string;
}

export const useLiveGames = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: games, isLoading } = useQuery({
    queryKey: ["live-games", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("live_games")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as LiveGame[];
    },
    enabled: !!user,
  });

  const createGame = useMutation({
    mutationFn: async ({
      title,
      quiz_id,
      game_id,
      questions,
      institution_id,
      subject,
      grade_level,
    }: {
      title: string;
      quiz_id?: string;
      game_id?: string;
      questions: Omit<LiveGameQuestion, 'id' | 'game_id' | 'created_at'>[];
      institution_id?: string;
      subject?: string;
      grade_level?: GradeLevel;
    }) => {
      if (!user) throw new Error("User not authenticated");

      console.log("Creating game with:", { title, quiz_id, game_id, questionsCount: questions.length });

      // Generate PIN
      const { data: pinData, error: pinError } = await supabase
        .rpc('generate_game_pin');

      if (pinError) {
        console.error("Error generating PIN:", pinError);
        throw pinError;
      }

      console.log("Generated PIN:", pinData);

      // Create game
      const { data: gameData, error: gameError } = await supabase
        .from("live_games")
        .insert([{
          creator_id: user.id,
          quiz_id,
          game_id,
          title,
          pin: pinData,
          status: 'waiting' as const,
          institution_id,
          subject,
          ...(grade_level && { grade_level }),
        }])
        .select()
        .single();

      if (gameError) {
        console.error("Error creating game:", gameError);
        throw gameError;
      }

      console.log("Game created:", gameData);

      // Create questions with proper formatting
      const questionsWithGameId = questions.map((q, index) => {
        // Ensure options is a proper JSONB array
        const formattedOptions = Array.isArray(q.options) 
          ? q.options.map(opt => {
              if (typeof opt === 'string') {
                return { text: opt, image_url: '' };
              }
              return {
                text: opt.text || '',
                image_url: opt.image_url || ''
              };
            })
          : [];

        return {
          game_id: gameData.id,
          question_text: q.question_text,
          question_type: q.question_type || 'multiple_choice',
          options: formattedOptions,
          correct_answer: q.correct_answer,
          points: q.points || 1000,
          time_limit: q.time_limit || 20,
          order_index: index,
          ...(q.image_url && { image_url: q.image_url }),
          ...(q.video_url && { video_url: q.video_url }),
          ...(q.feedback && { feedback: q.feedback }),
        };
      });

      console.log("Inserting questions:", questionsWithGameId);

      const { error: questionsError } = await supabase
        .from("live_game_questions")
        .insert(questionsWithGameId);

      if (questionsError) {
        console.error("Error creating questions:", questionsError);
        throw questionsError;
      }

      console.log("Questions created successfully");

      return gameData as LiveGame;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-games"] });
      toast.success("Juego creado exitosamente");
    },
    onError: (error) => {
      console.error("Error creating game:", error);
      toast.error(`Error al crear el juego: ${error.message}`);
    },
  });

  const startGame = useMutation({
    mutationFn: async (gameId: string) => {
      const { error } = await supabase
        .from("live_games")
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', gameId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-games"] });
      toast.success("¡Juego iniciado!");
    },
    onError: () => {
      toast.error("Error al iniciar el juego");
    },
  });

  const nextQuestion = useMutation({
    mutationFn: async ({ gameId, nextIndex }: { gameId: string; nextIndex: number }) => {
      const { error } = await supabase
        .from("live_games")
        .update({ current_question_index: nextIndex })
        .eq('id', gameId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-games"] });
    },
  });

  const finishGame = useMutation({
    mutationFn: async (gameId: string) => {
      const { error } = await supabase
        .from("live_games")
        .update({
          status: 'finished',
          finished_at: new Date().toISOString(),
        })
        .eq('id', gameId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-games"] });
      toast.success("¡Juego finalizado!");
    },
  });

  const deleteGame = useMutation({
    mutationFn: async (gameId: string) => {
      const { error } = await supabase
        .from("live_games")
        .delete()
        .eq('id', gameId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-games"] });
      toast.success("Juego eliminado");
    },
    onError: () => {
      toast.error("Error al eliminar el juego");
    },
  });

  const replayGame = useMutation({
    mutationFn: async (originalGameId: string) => {
      if (!user) throw new Error("User not authenticated");

      // Get original game data
      const { data: originalGame, error: gameError } = await supabase
        .from("live_games")
        .select("*")
        .eq("id", originalGameId)
        .single();

      if (gameError) throw gameError;

      // Get original questions
      const { data: originalQuestions, error: questionsError } = await supabase
        .from("live_game_questions")
        .select("*")
        .eq("game_id", originalGameId)
        .order("order_index", { ascending: true });

      if (questionsError) throw questionsError;

      // Generate new PIN
      const { data: pinData, error: pinError } = await supabase
        .rpc('generate_game_pin');

      if (pinError) throw pinError;

      // Create new game
      const { data: newGameData, error: newGameError } = await supabase
        .from("live_games")
        .insert([{
          creator_id: user.id,
          quiz_id: originalGame.quiz_id,
          game_id: originalGame.game_id,
          title: originalGame.title,
          pin: pinData,
          status: 'waiting' as const,
          institution_id: originalGame.institution_id,
          subject: originalGame.subject,
          grade_level: originalGame.grade_level,
        }])
        .select()
        .single();

      if (newGameError) throw newGameError;

      // Create questions for new game
      const questionsToInsert = originalQuestions.map((q) => ({
        game_id: newGameData.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        points: q.points,
        time_limit: q.time_limit,
        order_index: q.order_index,
        image_url: q.image_url,
        video_url: q.video_url,
      }));

      const { error: insertQuestionsError } = await supabase
        .from("live_game_questions")
        .insert(questionsToInsert);

      if (insertQuestionsError) throw insertQuestionsError;

      return newGameData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-games"] });
      toast.success("Juego recreado exitosamente");
    },
    onError: (error) => {
      console.error("Error replaying game:", error);
      toast.error("Error al recrear el juego");
    },
  });

  return {
    games,
    isLoading,
    createGame,
    startGame,
    nextQuestion,
    finishGame,
    deleteGame,
    replayGame,
  };
};

export const useLiveGameDetails = (gameId?: string) => {
  const queryClient = useQueryClient();

  const { data: game, isLoading: gameLoading } = useQuery({
    queryKey: ["live-game", gameId],
    queryFn: async () => {
      if (!gameId) return null;

      const { data, error } = await supabase
        .from("live_games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (error) throw error;
      return data as LiveGame;
    },
    enabled: !!gameId,
  });

  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ["live-game-questions", gameId],
    queryFn: async () => {
      if (!gameId) return [];

      const { data, error } = await supabase
        .from("live_game_questions")
        .select("*")
        .eq("game_id", gameId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return (data || []).map(q => ({
        ...q,
        options: q.options as Array<{ text: string; image_url?: string }>,
      })) as LiveGameQuestion[];
    },
    enabled: !!gameId,
  });

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ["live-game-players", gameId],
    queryFn: async () => {
      if (!gameId) return [];

      const { data, error } = await supabase
        .from("live_game_players")
        .select("*")
        .eq("game_id", gameId)
        .order("total_score", { ascending: false });

      if (error) throw error;
      return data as LiveGamePlayer[];
    },
    enabled: !!gameId,
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!gameId) return;

    console.log('[LiveGame] Setting up realtime for game:', gameId);

    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from("live_game_players")
        .select("*")
        .eq("game_id", gameId)
        .order("total_score", { ascending: false });
      if (!error && data) {
        queryClient.setQueryData(["live-game-players", gameId], data as LiveGamePlayer[]);
      }
    };

    const fetchGame = async () => {
      const { data, error } = await supabase
        .from("live_games")
        .select("*")
        .eq("id", gameId)
        .single();
      if (!error && data) {
        queryClient.setQueryData(["live-game", gameId], data as LiveGame);
      }
    };

    const channelName = `live-game-host-${gameId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          console.log('[LiveGame] Game update:', payload.eventType);
          // Update cache directly with new data to avoid refetch delay
          if (payload.new) {
            queryClient.setQueryData(["live-game", gameId], payload.new as LiveGame);
          } else {
            fetchGame();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_game_players',
        },
        (payload) => {
          console.log('[LiveGame] Player joined:', payload.new);
          // Only update if this player belongs to our game
          if (payload.new && (payload.new as any).game_id === gameId) {
            fetchPlayers();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_game_players',
        },
        (payload) => {
          console.log('[LiveGame] Player updated:', payload.new);
          if (payload.new && (payload.new as any).game_id === gameId) {
            fetchPlayers();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_game_answers',
        },
        () => {
          // Refetch players to get updated scores
          fetchPlayers();
        }
      )
      .subscribe((status, err) => {
        console.log('[LiveGame] Channel status:', status, err ?? '');
      });

    return () => {
      console.log('[LiveGame] Removing channel for game:', gameId);
      supabase.removeChannel(channel);
    };
  }, [gameId, queryClient]);

  return {
    game,
    questions,
    players,
    isLoading: gameLoading || questionsLoading || playersLoading,
  };
};

export const useJoinLiveGame = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const joinGame = useMutation({
    mutationFn: async ({ pin, playerName }: { pin: string; playerName: string }) => {
      // Find game by PIN
      const { data: gameData, error: gameError } = await supabase
        .from("live_games")
        .select("*")
        .eq("pin", pin)
        .in("status", ["waiting", "in_progress"])
        .single();

      if (gameError) throw new Error("Código PIN inválido o juego no disponible");

      // Check if player already joined
      const { data: existingPlayer } = await supabase
        .from("live_game_players")
        .select("*")
        .eq("game_id", gameData.id)
        .eq("player_name", playerName)
        .maybeSingle();

      if (existingPlayer) {
        throw new Error("Ya existe un jugador con ese nombre en este juego");
      }

      // Join game
      const { data: playerData, error: playerError } = await supabase
        .from("live_game_players")
        .insert({
          game_id: gameData.id,
          user_id: user?.id || null,
          player_name: playerName,
          total_score: 0,
        })
        .select()
        .single();

      if (playerError) {
        if (playerError.code === '23505') {
          throw new Error("Ya estás registrado en este juego");
        }
        throw playerError;
      }

      return { game: gameData as LiveGame, player: playerData as LiveGamePlayer };
    },
    onSuccess: () => {
      toast.success("¡Te has unido al juego!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al unirse al juego");
    },
  });

  return { joinGame };
};

export const useSubmitAnswer = () => {
  const queryClient = useQueryClient();

  const submitAnswer = useMutation({
    mutationFn: async ({
      playerId,
      questionId,
      selectedAnswer,
      responseTimeMs,
      correctAnswer,
      maxPoints,
      timeLimitMs,
    }: {
      playerId: string;
      questionId: string;
      selectedAnswer: number;
      responseTimeMs: number;
      correctAnswer: number;
      maxPoints: number;
      timeLimitMs?: number;
    }) => {
      const isCorrect = selectedAnswer === correctAnswer;

      // Points: correct → between 50%–100% of maxPoints based on speed.
      // At time=0 → 100% of maxPoints. At timeLimitMs → 50% of maxPoints.
      let pointsEarned = 0;
      if (isCorrect) {
        const allowedMs = timeLimitMs ?? 20000;
        const clampedTime = Math.min(responseTimeMs, allowedMs);
        const timeFraction = 1 - (clampedTime / allowedMs) * 0.5;
        pointsEarned = Math.max(Math.round(maxPoints * timeFraction), Math.round(maxPoints * 0.5));
      }

      console.log('[Submit] answer:', { playerId, questionId, selectedAnswer, isCorrect, responseTimeMs, pointsEarned });

      // Guard: avoid duplicate submissions for the same question
      const { data: existingAnswer } = await supabase
        .from("live_game_answers")
        .select("id")
        .eq("player_id", playerId)
        .eq("question_id", questionId)
        .maybeSingle();

      if (existingAnswer) {
        console.warn('[Submit] Already answered this question, skipping.');
        return { isCorrect, pointsEarned: 0 };
      }

      // Insert answer record
      const { error: answerError } = await supabase
        .from("live_game_answers")
        .insert({
          player_id: playerId,
          question_id: questionId,
          selected_answer: selectedAnswer,
          is_correct: isCorrect,
          response_time_ms: responseTimeMs,
          points_earned: pointsEarned,
        });

      if (answerError) {
        console.error('[Submit] Error inserting answer:', answerError);
        throw answerError;
      }

      // Fetch current player data to compute new total
      const { data: playerData, error: fetchError } = await supabase
        .from("live_game_players")
        .select("total_score, game_id")
        .eq("id", playerId)
        .single();

      if (fetchError) {
        console.error('[Submit] Error fetching player:', fetchError);
        throw fetchError;
      }

      const newScore = (playerData.total_score ?? 0) + pointsEarned;
      console.log('[Submit] Updating score:', { old: playerData.total_score, add: pointsEarned, new: newScore });

      const { error: updateError } = await supabase
        .from("live_game_players")
        .update({ total_score: newScore })
        .eq("id", playerId);

      if (updateError) {
        console.error('[Submit] Error updating score:', updateError);
        throw updateError;
      }

      // Immediately update cache so the player sees their score right away
      queryClient.setQueryData(
        ["live-game-players", playerData.game_id],
        (old: LiveGamePlayer[] | undefined) =>
          old
            ? old
                .map((p) =>
                  p.id === playerId ? { ...p, total_score: newScore } : p
                )
                .sort((a, b) => b.total_score - a.total_score)
            : old
      );

      return { isCorrect, pointsEarned };
    },
    onSuccess: (data) => {
      console.log('[Submit] Success:', data);
    },
    onError: (error) => {
      console.error('[Submit] Error:', error);
    },
  });

  return { submitAnswer };
};