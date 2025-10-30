import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { TriviaQuestion } from "./useTriviaGame";
import { useEffect } from "react";

export interface TriviaMatch {
  id: string;
  match_code: string;
  status: 'waiting' | 'active' | 'finished';
  current_player_id: string | null;
  current_category_id: string | null;
  current_question_number: number;
  winner_id: string | null;
  level: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface TriviaMatchPlayer {
  id: string;
  match_id: string;
  user_id: string;
  player_number: number;
  characters_collected: string[];
  current_streak: number;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

export function useTriviaMatch(matchId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Subscribe to match updates
  useEffect(() => {
    if (!matchId) return;

      const channel = supabase
      .channel(`match-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trivia_1v1_matches',
          filter: `id=eq.${matchId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['trivia-match', matchId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trivia_1v1_players',
          filter: `match_id=eq.${matchId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['trivia-match-players', matchId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, queryClient]);

  // Get match data
  const { data: match, isLoading: loadingMatch } = useQuery({
    queryKey: ['trivia-match', matchId],
    queryFn: async () => {
      if (!matchId) return null;
      const { data, error } = await supabase
        .from('trivia_1v1_matches')
        .select('*')
        .eq('id', matchId)
        .single();
      if (error) throw error;
      return data as TriviaMatch;
    },
    enabled: !!matchId
  });

  // Get match players
  const { data: players, isLoading: loadingPlayers } = useQuery({
    queryKey: ['trivia-match-players', matchId],
    queryFn: async () => {
      if (!matchId) return [];
      const { data, error } = await supabase
        .from('trivia_1v1_players')
        .select('*, profiles(username, avatar_url)')
        .eq('match_id', matchId)
        .order('player_number');
      if (error) throw error;
      return data as TriviaMatchPlayer[];
    },
    enabled: !!matchId
  });

  // Create match
  const createMatch = useMutation({
    mutationFn: async (level: string) => {
      if (!user) throw new Error("User not authenticated");
      
      const matchCode = generateMatchCode();
      
      const { data: match, error: matchError } = await supabase
        .from('trivia_1v1_matches')
        .insert({
          match_code: matchCode,
          level,
          status: 'waiting'
        })
        .select()
        .single();
      
      if (matchError) throw matchError;

      const { error: playerError } = await supabase
        .from('trivia_1v1_players')
        .insert({
          match_id: match.id,
          user_id: user.id,
          player_number: 1
        });
      
      if (playerError) throw playerError;

      return match as TriviaMatch;
    }
  });

  // Join match
  const joinMatch = useMutation({
    mutationFn: async (matchCode: string) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data: match, error: matchError } = await supabase
        .from('trivia_1v1_matches')
        .select('*')
        .eq('match_code', matchCode.toUpperCase())
        .in('status', ['waiting', 'active'])
        .single();
      
      if (matchError) throw new Error("No se encontró la partida");

      const { data: existingPlayers } = await supabase
        .from('trivia_1v1_players')
        .select('*')
        .eq('match_id', match.id);

      if (existingPlayers && existingPlayers.length >= 2) {
        throw new Error("La partida está llena");
      }

      // Check if user is already in this match
      if (existingPlayers?.some(p => p.user_id === user.id)) {
        return match as TriviaMatch;
      }

      const { error: playerError } = await supabase
        .from('trivia_1v1_players')
        .insert({
          match_id: match.id,
          user_id: user.id,
          player_number: 2
        });
      
      if (playerError) throw playerError;

      // Get first player ID
      const firstPlayer = existingPlayers?.[0];

      // Start the match and set first player's turn
      await supabase
        .from('trivia_1v1_matches')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
          current_player_id: firstPlayer?.user_id || null
        })
        .eq('id', match.id);

      return match as TriviaMatch;
    }
  });

  // Join random match via backend function to avoid RLS issues
  const joinRandomMatch = useMutation({
    mutationFn: async (level: string) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.functions.invoke('join-random-1v1', {
        body: { level }
      });
      if (error) throw error;

      const match = data?.match;
      if (!match?.id) throw new Error('No se pudo iniciar la partida');
      return match as TriviaMatch;
    }
  });

  // Update player streak and characters
  const updatePlayer = useMutation({
    mutationFn: async ({ 
      playerId, 
      streak, 
      characters 
    }: { 
      playerId: string; 
      streak?: number; 
      characters?: string[] 
    }) => {
      const updates: any = {};
      if (streak !== undefined) updates.current_streak = streak;
      if (characters !== undefined) updates.characters_collected = characters;

      const { error } = await supabase
        .from('trivia_1v1_players')
        .update(updates)
        .eq('id', playerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trivia-match-players', matchId] });
    }
  });

  // Record turn
  const recordTurn = useMutation({
    mutationFn: async (turnData: {
      match_id: string;
      player_id: string;
      category_id: string;
      question_id: string;
      answer_correct: boolean;
      time_taken: number;
      streak_at_answer: number;
      character_won?: string;
    }) => {
      const { error } = await supabase
        .from('trivia_1v1_turns')
        .insert(turnData);
      
      if (error) throw error;
    }
  });

  // Update match
  const updateMatch = useMutation({
    mutationFn: async (updates: Partial<TriviaMatch>) => {
      if (!matchId) throw new Error("No match ID");
      
      const { error } = await supabase
        .from('trivia_1v1_matches')
        .update(updates)
        .eq('id', matchId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trivia-match', matchId] });
    }
  });

  // Fetch questions for category and level
  const fetchQuestions = async (categoryId: string, level: string): Promise<TriviaQuestion[]> => {
    let query = supabase
      .from('trivia_questions')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true);

    if (level !== 'libre') {
      query = query.eq('level', level);
    }

    const { data, error } = await query.limit(50); // Get more questions to randomize
    
    if (error) throw error;
    
    // Shuffle and take only 10 questions
    const shuffled = (data || [])
      .map(q => {
        // Parse options if they're a string
        const optionsArray = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        
        // Transform options array into the expected format with option_text and is_correct
        const transformedOptions = optionsArray.map((optionText: string, index: number) => ({
          option_text: optionText,
          is_correct: index === q.correct_answer
        }));
        
        return {
          ...q,
          options: transformedOptions
        };
      })
      .sort(() => Math.random() - 0.5) // Randomize order
      .slice(0, 10); // Take only 10
    
    return shuffled as TriviaQuestion[];
  };

  return {
    match,
    players,
    loadingMatch,
    loadingPlayers,
    createMatch,
    joinMatch,
    joinRandomMatch,
    updatePlayer,
    recordTurn,
    updateMatch,
    fetchQuestions
  };
}

function generateMatchCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
