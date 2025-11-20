import { useParams, useNavigate } from "react-router-dom";
import { useLiveGameDetails } from "@/hooks/useLiveGames";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Home } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useEffect } from "react";

const LiveGameResults = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { game, players, isLoading } = useLiveGameDetails(gameId);

  useEffect(() => {
    // Trigger confetti
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Skeleton className="h-12 w-64 mb-8" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!game || !players) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Resultados no encontrados</p>
        </Card>
      </div>
    );
  }

  const topPlayers = players.slice(0, 3);
  const otherPlayers = players.slice(3);

  const getPodiumHeight = (position: number) => {
    switch (position) {
      case 0:
        return "h-64";
      case 1:
        return "h-48";
      case 2:
        return "h-40";
      default:
        return "h-32";
    }
  };

  const getPodiumColor = (position: number) => {
    switch (position) {
      case 0:
        return "bg-gradient-to-t from-yellow-500 to-yellow-300";
      case 1:
        return "bg-gradient-to-t from-gray-400 to-gray-300";
      case 2:
        return "bg-gradient-to-t from-orange-600 to-orange-400";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Trophy className="w-20 h-20 mx-auto mb-4 text-yellow-500" />
          <h1 className="text-4xl font-bold mb-2">{game.title}</h1>
          <p className="text-xl text-muted-foreground">Resultados Finales</p>
        </div>

        {/* Podium */}
        <div className="mb-12">
          <div className="flex items-end justify-center gap-4 mb-8">
            {/* 2nd Place */}
            {topPlayers[1] && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex-1 max-w-xs"
              >
                <Card className="p-6 text-center mb-2">
                  <Medal className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="font-bold text-lg">{topPlayers[1].player_name}</p>
                  <p className="text-2xl font-bold text-primary">{topPlayers[1].total_score}</p>
                </Card>
                <div className={`${getPodiumHeight(1)} ${getPodiumColor(1)} rounded-t-lg flex items-center justify-center`}>
                  <span className="text-6xl font-bold text-white">2</span>
                </div>
              </motion.div>
            )}

            {/* 1st Place */}
            {topPlayers[0] && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex-1 max-w-xs"
              >
                <Card className="p-6 text-center mb-2">
                  <Trophy className="w-16 h-16 mx-auto mb-2 text-yellow-500" />
                  <p className="font-bold text-xl">{topPlayers[0].player_name}</p>
                  <p className="text-3xl font-bold text-primary">{topPlayers[0].total_score}</p>
                </Card>
                <div className={`${getPodiumHeight(0)} ${getPodiumColor(0)} rounded-t-lg flex items-center justify-center`}>
                  <span className="text-7xl font-bold text-white">1</span>
                </div>
              </motion.div>
            )}

            {/* 3rd Place */}
            {topPlayers[2] && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex-1 max-w-xs"
              >
                <Card className="p-6 text-center mb-2">
                  <Medal className="w-12 h-12 mx-auto mb-2 text-orange-600" />
                  <p className="font-bold text-lg">{topPlayers[2].player_name}</p>
                  <p className="text-2xl font-bold text-primary">{topPlayers[2].total_score}</p>
                </Card>
                <div className={`${getPodiumHeight(2)} ${getPodiumColor(2)} rounded-t-lg flex items-center justify-center`}>
                  <span className="text-6xl font-bold text-white">3</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Other Players */}
        {otherPlayers.length > 0 && (
          <Card className="p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Clasificación General</h2>
            <div className="space-y-2">
              {otherPlayers.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold w-8">{index + 4}</span>
                    <span className="font-semibold text-lg">{player.player_name}</span>
                  </div>
                  <span className="text-xl font-bold text-primary">{player.total_score}</span>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Button onClick={() => navigate("/live-games")} size="lg">
            <Home className="w-5 h-5 mr-2" />
            Volver a Juegos
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LiveGameResults;
