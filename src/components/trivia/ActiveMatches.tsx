import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Play } from "lucide-react";
import { motion } from "framer-motion";

interface ActiveMatchesProps {
  onMatchSelect: (matchId: string) => void;
}

export function ActiveMatches({ onMatchSelect }: ActiveMatchesProps) {
  const { user } = useAuth();

  const { data: activeMatches, isLoading } = useQuery({
    queryKey: ['user-active-matches', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // First get the player records for this user
      const { data: playerData, error: playerError } = await supabase
        .from('trivia_1v1_players')
        .select('match_id')
        .eq('user_id', user.id);

      if (playerError) {
        console.error('Error fetching player matches:', playerError);
        throw playerError;
      }

      if (!playerData || playerData.length === 0) return [];

      const matchIds = playerData.map(p => p.match_id);

      // Get the match details
      const { data: matches, error: matchError } = await supabase
        .from('trivia_1v1_matches')
        .select('*')
        .in('id', matchIds)
        .in('status', ['waiting', 'active'])
        .order('created_at', { ascending: false });

      if (matchError) {
        console.error('Error fetching matches:', matchError);
        throw matchError;
      }

      if (!matches || matches.length === 0) return [];

      // Get player info for each match
      const { data: allPlayers } = await supabase
        .from('trivia_1v1_players')
        .select('match_id, user_id, profiles(username)')
        .in('match_id', matches.map(m => m.id));

      const playersMap = allPlayers?.reduce((acc, p) => {
        if (!acc[p.match_id]) acc[p.match_id] = [];
        acc[p.match_id].push(p);
        return acc;
      }, {} as Record<string, any[]>) || {};

      return matches.map(match => ({
        match_id: match.id,
        matches: match,
        playerCount: playersMap[match.id]?.length || 0,
        players: playersMap[match.id] || []
      }));
    },
    enabled: !!user,
    refetchInterval: 3000 // Refetch every 3 seconds to check for updates
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Cargando partidas...</p>
        </CardContent>
      </Card>
    );
  }

  if (!activeMatches || activeMatches.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Partidas en Curso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeMatches.map((match) => {
            const matchData = match.matches as any;
            const isMyTurn = matchData.current_player_id === user?.id;
            const isWaiting = matchData.status === 'waiting' || match.playerCount < 2;
            const creator = match.players?.find((p: any) => p.user_id !== user?.id);
            const creatorName = creator?.profiles?.username || 'Jugador';
            
            return (
              <motion.div
                key={match.match_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold">
                      {matchData.match_code}
                    </span>
                    <Badge variant={isMyTurn ? "default" : "secondary"}>
                      {isWaiting ? (
                        <>
                          <Users className="w-3 h-3 mr-1" />
                          Esperando oponente
                        </>
                      ) : isMyTurn ? (
                        "Tu turno"
                      ) : (
                        "Esperando"
                      )}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="capitalize">Nivel: {matchData.level}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {match.playerCount}/2 jugadores
                    </span>
                    {isWaiting && match.playerCount === 1 && (
                      <>
                        <span>•</span>
                        <span>Creada por: {match.players[0]?.user_id === user?.id ? 'Ti' : creatorName}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <Button
                  onClick={() => onMatchSelect(match.match_id)}
                  variant={isMyTurn ? "default" : "outline"}
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-1" />
                  {isWaiting ? "Entrar" : "Continuar"}
                </Button>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
