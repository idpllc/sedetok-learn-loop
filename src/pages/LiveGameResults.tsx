import { useParams, useNavigate } from "react-router-dom";
import { useLiveGameDetails } from "@/hooks/useLiveGames";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Home, ArrowLeft, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useEffect } from "react";

const LiveGameResults = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { game, players, isLoading } = useLiveGameDetails(gameId);

  useEffect(() => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 space-y-4">
        <Skeleton className="h-10 w-48 mx-auto mt-8" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!game || !players) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center w-full max-w-sm">
          <p className="text-muted-foreground">Resultados no encontrados</p>
        </Card>
      </div>
    );
  }

  const topPlayers = players.slice(0, 3);
  const otherPlayers = players.slice(3);

  const podiumOrder = [topPlayers[1], topPlayers[0], topPlayers[2]].filter(Boolean);

  const podiumConfig = [
    { place: 2, height: "h-20 sm:h-28", color: "bg-gradient-to-t from-gray-400 to-gray-300", icon: <Medal className="w-5 h-5 text-gray-400" />, delay: 0.3 },
    { place: 1, height: "h-28 sm:h-40", color: "bg-gradient-to-t from-yellow-500 to-yellow-300", icon: <Trophy className="w-6 h-6 text-yellow-500" />, delay: 0.1 },
    { place: 3, height: "h-14 sm:h-20", color: "bg-gradient-to-t from-orange-600 to-orange-400", icon: <Medal className="w-5 h-5 text-orange-500" />, delay: 0.5 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950 pb-8">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">

        {/* Header */}
        <div className="text-center space-y-1">
          <Trophy className="w-12 h-12 mx-auto text-yellow-500" />
          <h1 className="text-2xl font-black truncate px-4">{game.title}</h1>
          <p className="text-sm text-muted-foreground">Resultados Finales</p>
        </div>

        {/* Podium */}
        {topPlayers.length > 0 && (
          <div className="flex items-end justify-center gap-2">
            {podiumOrder.map((player, i) => {
              const cfg = podiumConfig[i];
              if (!player) return null;
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: cfg.delay }}
                  className="flex-1 flex flex-col items-center min-w-0"
                >
                  {/* Player card above podium */}
                  <div className="w-full mb-1.5 text-center px-1">
                    <div className="flex justify-center mb-1">{cfg.icon}</div>
                    <p className="font-bold text-xs leading-tight truncate">{player.player_name}</p>
                    <p className="text-primary font-black text-sm">{player.total_score}</p>
                  </div>
                  {/* Podium block */}
                  <div className={`w-full ${cfg.height} ${cfg.color} rounded-t-xl flex items-center justify-center`}>
                    <span className="text-white font-black text-2xl sm:text-4xl">{cfg.place}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Ranking list */}
        {otherPlayers.length > 0 && (
          <Card className="p-4">
            <h2 className="text-base font-bold mb-3 text-center">Clasificación General</h2>
            <div className="space-y-1.5">
              {otherPlayers.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.07 }}
                  className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base font-bold w-6 text-center shrink-0">{index + 4}</span>
                    <span className="font-semibold text-sm truncate">{player.player_name}</span>
                  </div>
                  <span className="text-base font-bold text-primary shrink-0 ml-2">{player.total_score}</span>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-2"
        >
          <Button variant="outline" onClick={() => navigate(-1)} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <Button onClick={() => navigate("/live-games")} className="w-full">
            <Home className="w-4 h-4 mr-2" />
            Juegos en Vivo
          </Button>
          <Button variant="secondary" onClick={() => navigate("/")} className="w-full">
            <RotateCcw className="w-4 h-4 mr-2" />
            Inicio
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default LiveGameResults;
