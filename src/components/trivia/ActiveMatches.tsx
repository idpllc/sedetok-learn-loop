import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Play, ChevronRight } from "lucide-react";
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

      const { data: playerData } = await supabase
        .from('trivia_1v1_players')
        .select('match_id')
        .eq('user_id', user.id);

      if (!playerData || playerData.length === 0) return [];

      const matchIds = playerData.map(p => p.match_id);

      const { data: matches } = await supabase
        .from('trivia_1v1_matches')
        .select('*')
        .in('id', matchIds)
        .in('status', ['waiting', 'active'])
        .order('created_at', { ascending: false });

      if (!matches || matches.length === 0) return [];

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
    refetchInterval: 3000
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">Cargando partidas...</p>
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
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4 shrink-0" />
            Partidas en Curso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3 pt-0">
          {activeMatches.map((match) => {
            const matchData = match.matches as any;
            const isMyTurn = matchData.current_player_id === user?.id;
            const isWaiting = matchData.status === 'waiting' || match.playerCount < 2;
            const isCreatedByMe = match.players[0]?.user_id === user?.id;
            const creator = match.players?.find((p: any) => p.user_id !== user?.id);
            const creatorName = creator?.profiles?.username || 'Jugador';

            return (
              <motion.button
                key={match.match_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => onMatchSelect(match.match_id)}
                className="w-full flex items-center justify-between p-3 border rounded-xl hover:bg-accent/50 active:bg-accent/70 transition-colors text-left gap-2"
              >
                {/* Left: info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold tracking-wider shrink-0">
                      {matchData.match_code}
                    </span>
                    <Badge
                      variant={isWaiting ? "outline" : isMyTurn ? "default" : "secondary"}
                      className="text-xs px-2 py-0 h-5 shrink-0"
                    >
                      {isWaiting ? (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Esperando oponente
                        </span>
                      ) : isMyTurn ? (
                        "Tu turno ⚡"
                      ) : (
                        "Esperando"
                      )}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="capitalize">Nivel: {matchData.level}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {match.playerCount}/2
                    </span>
                    {isWaiting && match.playerCount === 1 && (
                      <>
                        <span>•</span>
                        <span className="truncate">
                          {isCreatedByMe ? "Creada por ti" : `Creada por: ${creatorName}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: action */}
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold shrink-0 ${
                  isMyTurn
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  <Play className="w-3 h-3" />
                  {isWaiting ? "Entrar" : "Continuar"}
                </div>
              </motion.button>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
