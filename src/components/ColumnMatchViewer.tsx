import { useState, useEffect, useRef } from "react";
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

interface DragLine {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export const ColumnMatchViewer = ({ gameId, onComplete }: ColumnMatchViewerProps) => {
  const navigate = useNavigate();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [leftItems, setLeftItems] = useState<ColumnItem[]>([]);
  const [rightItems, setRightItems] = useState<ColumnItem[]>([]);
  const [shuffledRightItems, setShuffledRightItems] = useState<ColumnItem[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ id: string; x: number; y: number } | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftItemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const rightItemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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

  const getItemEdge = (ref: HTMLDivElement | null, side: 'left' | 'right'): { x: number; y: number } | null => {
    if (!ref || !containerRef.current) return null;
    const rect = ref.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    return {
      x: side === 'left' 
        ? rect.right - containerRect.left  // Right edge of left item
        : rect.left - containerRect.left,   // Left edge of right item
      y: rect.top + rect.height / 2 - containerRect.top,
    };
  };

  const handleLeftMouseDown = (itemId: string, e: React.MouseEvent) => {
    if (completed) return;
    const isConnected = connections.some((conn) => conn.leftId === itemId);
    if (isConnected) return;

    const edge = getItemEdge(leftItemRefs.current[itemId], 'left');
    if (edge) {
      setIsDragging(true);
      setDragStart({ id: itemId, x: edge.x, y: edge.y });
      setCurrentMousePos({ x: edge.x, y: edge.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    setCurrentMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseUp = (rightId?: string) => {
    if (!isDragging || !dragStart) {
      setIsDragging(false);
      setDragStart(null);
      setCurrentMousePos(null);
      return;
    }

    if (rightId) {
      const leftItem = leftItems.find((item) => item.id === dragStart.id);
      const rightItem = rightItems.find((item) => item.id === rightId);

      if (!leftItem || !rightItem) {
        setIsDragging(false);
        setDragStart(null);
        setCurrentMousePos(null);
        return;
      }

      // Check if already connected
      const existingLeftConn = connections.find((conn) => conn.leftId === dragStart.id);
      const existingRightConn = connections.find((conn) => conn.rightId === rightId);

      if (existingLeftConn || existingRightConn) {
        toast.error("Estos items ya están conectados");
        setIsDragging(false);
        setDragStart(null);
        setCurrentMousePos(null);
        return;
      }

      // Check if match is correct
      if (leftItem.match_id === rightItem.match_id) {
        setConnections([...connections, { leftId: dragStart.id, rightId }]);
        setScore(score + 10);
        toast.success("¡Correcto! +10 puntos");

        if (connections.length + 1 === leftItems.length) {
          completeGame(true);
        }
      } else {
        setLives(lives - 1);
        toast.error("Incorrecto. -1 vida");

        if (lives - 1 <= 0) {
          completeGame(false);
        }
      }
    }

    setIsDragging(false);
    setDragStart(null);
    setCurrentMousePos(null);
  };

  const completeGame = async (success: boolean) => {
    setCompleted(true);

    const maxScore = leftItems.length * 10;
    const normalizedScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    if (success) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

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
            .update({ experience_points: (profile.experience_points || 0) + normalizedScore })
            .eq("id", user.id);
        }
      }

      toast.success(`¡Felicitaciones! Puntuación: ${normalizedScore}/100`);
    } else {
      toast.error(`Juego terminado. Puntuación: ${normalizedScore}/100`);
    }

    // Don't call onComplete here - let user close manually via button
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
    const maxScore = leftItems.length * 10;
    const normalizedScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    
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
            <p className="text-5xl font-bold text-primary mb-4">
              {normalizedScore}/100
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Conexiones correctas: {connections.length}/{leftItems.length}
            </p>
          </div>
          <Button onClick={onComplete} size="lg">
            Cerrar
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

      {/* Game Board with SVG overlay */}
      <div 
        ref={containerRef}
        className="relative"
        onMouseMove={handleMouseMove}
        onMouseUp={() => handleMouseUp()}
        onMouseLeave={() => handleMouseUp()}
      >
        {/* SVG for drawing lines */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{ overflow: 'visible' }}
        >
          {/* Draw completed connections */}
          {connections.map((conn) => {
            const leftEdge = getItemEdge(leftItemRefs.current[conn.leftId], 'left');
            const rightEdge = getItemEdge(rightItemRefs.current[conn.rightId], 'right');
            
            if (!leftEdge || !rightEdge) return null;

            const midX = (leftEdge.x + rightEdge.x) / 2;
            const curveOffset = 50;
            
            return (
              <g key={`${conn.leftId}-${conn.rightId}`}>
                <path
                  d={`M ${leftEdge.x} ${leftEdge.y} Q ${midX} ${leftEdge.y - curveOffset}, ${rightEdge.x} ${rightEdge.y}`}
                  stroke="hsl(var(--primary))"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  className="animate-fade-in"
                />
                <circle cx={leftEdge.x} cy={leftEdge.y} r="8" fill="hsl(var(--primary))" />
                <circle cx={rightEdge.x} cy={rightEdge.y} r="8" fill="hsl(var(--primary))" />
              </g>
            );
          })}

          {/* Draw dragging line */}
          {isDragging && dragStart && currentMousePos && (
            <g>
              <path
                d={`M ${dragStart.x} ${dragStart.y} Q ${(dragStart.x + currentMousePos.x) / 2} ${dragStart.y - 50}, ${currentMousePos.x} ${currentMousePos.y}`}
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                opacity="0.5"
                strokeDasharray="5,5"
              />
              <circle cx={dragStart.x} cy={dragStart.y} r="8" fill="hsl(var(--primary))" />
              <circle cx={currentMousePos.x} cy={currentMousePos.y} r="6" fill="hsl(var(--primary))" opacity="0.5" />
            </g>
          )}
        </svg>

        <div className="grid grid-cols-2 gap-8 relative">
          {/* Left Column */}
          <div className="space-y-3">
            {leftItems.map((item) => {
              const isConnected = connections.some((conn) => conn.leftId === item.id);

              return (
                <motion.div
                  key={item.id}
                  ref={(el) => (leftItemRefs.current[item.id] = el)}
                  whileHover={{ scale: isConnected ? 1 : 1.02 }}
                  whileTap={{ scale: isConnected ? 1 : 0.98 }}
                >
                  <Button
                    onMouseDown={(e) => handleLeftMouseDown(item.id, e)}
                    disabled={isConnected}
                    variant="outline"
                    className={`w-full h-auto min-h-[80px] p-4 flex flex-col gap-2 cursor-pointer relative ${
                      isConnected ? "opacity-50 bg-primary/20" : ""
                    }`}
                  >
                    {/* Connection point circle */}
                    <div className={`absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 ${
                      isConnected 
                        ? "bg-primary border-primary" 
                        : "bg-background border-primary"
                    }`} />
                    
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
                  ref={(el) => (rightItemRefs.current[item.id] = el)}
                  whileHover={{ scale: isConnected ? 1 : 1.02 }}
                  whileTap={{ scale: isConnected ? 1 : 0.98 }}
                  onMouseUp={() => handleMouseUp(item.id)}
                >
                  <Button
                    disabled={isConnected}
                    variant="outline"
                    className={`w-full h-auto min-h-[80px] p-4 flex flex-col gap-2 relative ${
                      isConnected ? "opacity-50 bg-primary/20" : ""
                    }`}
                  >
                    {/* Connection point circle */}
                    <div className={`absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 ${
                      isConnected 
                        ? "bg-primary border-primary" 
                        : "bg-background border-primary"
                    }`} />
                    
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
      </div>

      {/* Instructions */}
      <div className="bg-accent/50 p-4 rounded-lg text-center text-sm text-muted-foreground">
        Arrastra desde un item de la izquierda hasta su par correcto de la derecha
      </div>
    </div>
  );
};
