import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trophy, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface ColumnMatchViewerProps {
  gameId: string;
  onComplete?: () => void;
}

interface ColumnItem {
  id: string;
  text: string;
  image_url?: string;
  match_id: string;
}

interface GameData {
  title: string;
  description?: string;
  time_limit?: number;
}

interface Connection {
  leftId: string;
  rightId: string;
}

export const ColumnMatchViewer = ({ gameId, onComplete }: ColumnMatchViewerProps) => {
  const navigate = useNavigate();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [leftItems, setLeftItems] = useState<ColumnItem[]>([]);
  const [rightItems, setRightItems] = useState<ColumnItem[]>([]);
  const [shuffledRightItems, setShuffledRightItems] = useState<ColumnItem[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    fetchGameData();
  }, [gameId]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || completed) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          completeGame(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, completed]);

  const fetchGameData = async () => {
    try {
      const { data: game, error: gameError } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (gameError) throw gameError;

      setGameData({
        title: game.title,
        description: game.description,
        time_limit: game.time_limit,
      });

      const left = (game.left_column_items as unknown as ColumnItem[]) || [];
      const right = (game.right_column_items as unknown as ColumnItem[]) || [];

      if (left.length === 0 || right.length === 0) {
        toast.error("Este juego no tiene items configurados");
        return;
      }

      setLeftItems(left);
      setRightItems(right);
      setShuffledRightItems(shuffleArray([...right]));

      if (game.time_limit) {
        setTimeRemaining(game.time_limit);
      }
    } catch (error) {
      console.error("Error fetching game:", error);
      toast.error("Error al cargar el juego");
    } finally {
      setLoading(false);
    }
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const handleLeftClick = (leftId: string) => {
    if (completed) return;
    setSelectedLeft(leftId);
  };

  const handleRightClick = (rightId: string) => {
    if (!selectedLeft || completed) return;

    const leftItem = leftItems.find((item) => item.id === selectedLeft);
    const rightItem = rightItems.find((item) => item.id === rightId);

    if (!leftItem || !rightItem) return;

    // Check if already connected
    const existingConnection = connections.find(
      (conn) => conn.leftId === selectedLeft || conn.rightId === rightId
    );

    if (existingConnection) {
      toast.error("Estos items ya están conectados");
      setSelectedLeft(null);
      return;
    }

    // Check if match is correct
    if (leftItem.match_id === rightItem.match_id) {
      // Correct match
      setConnections([...connections, { leftId: selectedLeft, rightId }]);
      setScore(score + 10);
      toast.success("¡Correcto! +10 puntos");

      // Check if all matched
      if (connections.length + 1 === leftItems.length) {
        completeGame(true);
      }
    } else {
      // Incorrect match
      setLives(lives - 1);
      toast.error("Incorrecto. -1 vida");

      if (lives - 1 <= 0) {
        completeGame(false);
      }
    }

    setSelectedLeft(null);
  };

  const completeGame = async (success: boolean) => {
    setCompleted(true);

    if (success) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      // Award XP
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("experience_points")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          await supabase
            .from("profiles")
            .update({ experience_points: (profile.experience_points || 0) + score })
            .eq("id", user.id);
        }
      }

      toast.success(`¡Felicitaciones! Ganaste ${score} puntos`);
    } else {
      toast.error("Juego terminado");
    }

    if (onComplete) {
      onComplete();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando juego...</p>
        </div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No se pudo cargar el juego</p>
      </div>
    );
  }

  if (completed) {
    const success = connections.length === leftItems.length;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center min-h-[400px]"
      >
        <div className="text-center space-y-6 max-w-md">
          <Trophy className="w-20 h-20 mx-auto text-primary" />
          <div>
            <h2 className="text-3xl font-bold mb-2">
              {success ? "¡Felicitaciones!" : "Juego Terminado"}
            </h2>
            <p className="text-xl text-muted-foreground mb-4">
              Puntuación final: {score}
            </p>
            <p className="text-sm text-muted-foreground">
              Conexiones correctas: {connections.length}/{leftItems.length}
            </p>
          </div>
          <Button onClick={() => navigate(-1)} size="lg">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </motion.div>
    );
  }

  const progress = (connections.length / leftItems.length) * 100;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{gameData.title}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-destructive" />
              <span className="font-bold">{lives}</span>
            </div>
            <div className="text-lg font-bold">
              {score} pts
            </div>
          </div>
        </div>

        {gameData.description && (
          <p className="text-muted-foreground">{gameData.description}</p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Conectadas: {connections.length}/{leftItems.length}
            </span>
            {timeRemaining !== null && (
              <span className="font-mono font-bold">
                {formatTime(timeRemaining)}
              </span>
            )}
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Game Board */}
      <div className="grid grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-3">
          {leftItems.map((item) => {
            const isConnected = connections.some((conn) => conn.leftId === item.id);
            const isSelected = selectedLeft === item.id;

            return (
              <motion.div
                key={item.id}
                whileHover={{ scale: isConnected ? 1 : 1.02 }}
                whileTap={{ scale: isConnected ? 1 : 0.98 }}
              >
                <Button
                  onClick={() => handleLeftClick(item.id)}
                  disabled={isConnected}
                  variant={isSelected ? "default" : "outline"}
                  className={`w-full h-auto min-h-[80px] p-4 flex flex-col gap-2 ${
                    isConnected ? "opacity-50" : ""
                  }`}
                >
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.text}
                      className="w-full h-24 object-cover rounded"
                    />
                  )}
                  <span className="text-base">{item.text}</span>
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {shuffledRightItems.map((item) => {
            const isConnected = connections.some((conn) => conn.rightId === item.id);

            return (
              <motion.div
                key={item.id}
                whileHover={{ scale: isConnected ? 1 : 1.02 }}
                whileTap={{ scale: isConnected ? 1 : 0.98 }}
              >
                <Button
                  onClick={() => handleRightClick(item.id)}
                  disabled={isConnected || !selectedLeft}
                  variant="outline"
                  className={`w-full h-auto min-h-[80px] p-4 flex flex-col gap-2 ${
                    isConnected ? "opacity-50 bg-primary/20" : ""
                  }`}
                >
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.text}
                      className="w-full h-24 object-cover rounded"
                    />
                  )}
                  <span className="text-base">{item.text}</span>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-accent/50 p-4 rounded-lg text-center text-sm text-muted-foreground">
        Selecciona un item de la izquierda, luego su par correcto de la derecha
      </div>
    </div>
  );
};
