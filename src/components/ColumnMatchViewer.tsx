import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trophy, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useIsMobile } from "@/hooks/use-mobile";

interface ColumnMatchViewerProps {
  gameId: string;
  onComplete?: () => void;
  evaluationEventId?: string;
  showResultsImmediately?: boolean;
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

export const ColumnMatchViewer = ({ gameId, onComplete, evaluationEventId, showResultsImmediately = true }: ColumnMatchViewerProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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
  
  // Click selection for mobile
  const [selectedLeftItem, setSelectedLeftItem] = useState<string | null>(null);
  
  // Drag state for desktop
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

  const handleLeftClick = (itemId: string) => {
    if (completed) return;
    const isConnected = connections.some((conn) => conn.leftId === itemId);
    if (isConnected) return;

    if (isMobile) {
      // Mobile: toggle selection
      setSelectedLeftItem(selectedLeftItem === itemId ? null : itemId);
    }
  };

  const handleLeftMouseDown = (itemId: string, e: React.MouseEvent) => {
    if (completed || isMobile) return;
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

  const handleRightClick = (rightId: string) => {
    if (completed) return;
    const isConnected = connections.some((conn) => conn.rightId === rightId);
    if (isConnected) return;

    if (isMobile && selectedLeftItem) {
      // Mobile: make connection with selected left item
      makeConnection(selectedLeftItem, rightId);
      setSelectedLeftItem(null);
    }
  };

  const makeConnection = (leftId: string, rightId: string) => {
    const leftItem = leftItems.find((item) => item.id === leftId);
    const rightItem = rightItems.find((item) => item.id === rightId);

    if (!leftItem || !rightItem) return;

    // Check if already connected
    const existingLeftConn = connections.find((conn) => conn.leftId === leftId);
    const existingRightConn = connections.find((conn) => conn.rightId === rightId);

    if (existingLeftConn || existingRightConn) {
      toast.error("Estos items ya están conectados");
      return;
    }

    // Check if match is correct
    if (leftItem.match_id === rightItem.match_id) {
      setConnections([...connections, { leftId, rightId }]);
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
  };

  const handleMouseUp = (rightId?: string) => {
    if (isMobile || !isDragging || !dragStart) {
      setIsDragging(false);
      setDragStart(null);
      setCurrentMousePos(null);
      return;
    }

    if (rightId) {
      makeConnection(dragStart.id, rightId);
    }

    setIsDragging(false);
    setDragStart(null);
    setCurrentMousePos(null);
  };

  const completeGame = async (success: boolean) => {
    setCompleted(true);

    const maxScore = leftItems.length * 10;
    const normalizedScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = normalizedScore >= 60;

    if (success) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    // Save result to database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const payload: any = {
        user_id: user.id,
        game_id: gameId,
        score: normalizedScore,
        max_score: 100,
        passed,
      };

      if (evaluationEventId) {
        payload.evaluation_event_id = evaluationEventId;
      }

      await supabase.from("user_quiz_results").insert(payload);

      // Award XP
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

    if (showResultsImmediately) {
      if (success) {
        toast.success(`¡Felicitaciones! Puntuación: ${normalizedScore}/100`);
      } else {
        toast.error(`Juego terminado. Puntuación: ${normalizedScore}/100`);
      }
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
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-500 to-green-400 p-2 md:p-6">
      {/* Header */}
      <div className="bg-green-600/80 backdrop-blur-sm rounded-xl p-3 md:p-6 mb-3 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5">
            <Heart className="w-4 h-4 text-white fill-white" />
            <span className="font-bold text-white text-base">{lives}</span>
          </div>
          <h1 className="text-base md:text-2xl font-bold text-white text-center flex-1 px-2">{gameData.title}</h1>
          <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5">
            <span className="font-bold text-white text-base">{score}</span>
          </div>
        </div>

        {gameData.description && (
          <p className="text-white/90 text-center text-xs md:text-base mb-3">{gameData.description}</p>
        )}

        <div className="flex items-center justify-between text-xs text-white">
          <span className="font-medium">
            Parejas: {connections.length}/{leftItems.length}
          </span>
          {timeRemaining !== null && (
            <span className="font-mono font-bold text-base">
              {formatTime(timeRemaining)}
            </span>
          )}
        </div>
        <Progress value={progress} className="h-2 mt-2 bg-white/20" />
      </div>

      {/* Game Board with SVG overlay */}
      <div 
        ref={containerRef}
        className="relative bg-white/10 backdrop-blur-sm rounded-xl p-2 md:p-4"
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
            const curveOffset = 30;
            
            return (
              <g key={`${conn.leftId}-${conn.rightId}`}>
                <path
                  d={`M ${leftEdge.x} ${leftEdge.y} Q ${midX} ${leftEdge.y - curveOffset}, ${rightEdge.x} ${rightEdge.y}`}
                  stroke="#86efac"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  className="animate-fade-in"
                />
                <circle cx={leftEdge.x} cy={leftEdge.y} r="10" fill="#86efac" />
                <circle cx={rightEdge.x} cy={rightEdge.y} r="10" fill="#86efac" />
              </g>
            );
          })}

          {/* Draw dragging line */}
          {isDragging && dragStart && currentMousePos && (
            <g>
              <path
                d={`M ${dragStart.x} ${dragStart.y} Q ${(dragStart.x + currentMousePos.x) / 2} ${dragStart.y - 30}, ${currentMousePos.x} ${currentMousePos.y}`}
                stroke="#86efac"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                opacity="0.6"
                strokeDasharray="8,8"
              />
              <circle cx={dragStart.x} cy={dragStart.y} r="10" fill="#86efac" />
              <circle cx={currentMousePos.x} cy={currentMousePos.y} r="8" fill="#86efac" opacity="0.6" />
            </g>
          )}
        </svg>

        <div className="grid grid-cols-2 gap-2 md:gap-4 relative">
          {/* Left Column */}
          <div className="space-y-1.5 md:space-y-2">
            {leftItems.map((item) => {
              const isConnected = connections.some((conn) => conn.leftId === item.id);
              const isSelected = selectedLeftItem === item.id;

              return (
                <motion.div
                  key={item.id}
                  ref={(el) => (leftItemRefs.current[item.id] = el)}
                  whileHover={{ scale: isConnected ? 1 : 1.02 }}
                  whileTap={{ scale: isConnected ? 1 : 0.98 }}
                >
                  <button
                    onClick={() => handleLeftClick(item.id)}
                    onMouseDown={(e) => handleLeftMouseDown(item.id, e)}
                    disabled={isConnected}
                    className={`w-full h-auto min-h-[50px] md:min-h-[60px] p-2 md:p-3 cursor-pointer relative overflow-hidden transition-all duration-200 
                      ${isConnected 
                        ? "bg-white/40 opacity-60" 
                        : isSelected
                        ? "bg-green-300 shadow-lg scale-105"
                        : "bg-white hover:bg-green-50 hover:shadow-md"
                      } rounded-2xl md:rounded-3xl border-2 ${isSelected ? "border-green-600" : "border-green-300"}`}
                  >
                    {/* Connection point circle */}
                    <div className={`absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-7 h-7 md:w-9 md:h-9 rounded-full z-20 transition-all duration-200 flex items-center justify-center
                      ${isConnected 
                        ? "bg-green-300 border-3 border-green-400" 
                        : isSelected
                        ? "bg-green-300 border-3 border-green-400 animate-pulse scale-110"
                        : "bg-green-200 border-3 border-green-300"
                      }`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                    </div>
                    
                    <div className="w-full flex flex-col gap-1 overflow-hidden pr-5">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.text}
                          className="w-full h-12 md:h-16 object-cover rounded-xl flex-shrink-0"
                        />
                      )}
                      <div className="max-h-[3.6em] overflow-y-auto text-left scrollbar-thin scrollbar-thumb-green-300 scrollbar-track-transparent">
                        <span className="text-xs md:text-sm text-gray-900 break-words hyphens-auto leading-tight font-medium block">{item.text}</span>
                      </div>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Right Column */}
          <div className="space-y-1.5 md:space-y-2">
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
                  <button
                    onClick={() => handleRightClick(item.id)}
                    disabled={isConnected || (isMobile && !selectedLeftItem)}
                    className={`w-full h-auto min-h-[50px] md:min-h-[60px] p-2 md:p-3 cursor-pointer relative overflow-hidden transition-all duration-200
                      ${isConnected 
                        ? "bg-white/40 opacity-60" 
                        : "bg-white hover:bg-green-50 hover:shadow-md"
                      } rounded-2xl md:rounded-3xl border-2 border-green-300
                      ${isMobile && !selectedLeftItem ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {/* Connection point circle */}
                    <div className={`absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-7 h-7 md:w-9 md:h-9 rounded-full z-20 transition-all duration-200 flex items-center justify-center
                      ${isConnected 
                        ? "bg-green-300 border-3 border-green-400" 
                        : "bg-green-200 border-3 border-green-300"
                      }`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                    </div>
                    
                    <div className="w-full flex flex-col gap-1 overflow-hidden pl-5">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.text}
                          className="w-full h-12 md:h-16 object-cover rounded-xl flex-shrink-0"
                        />
                      )}
                      <div className="max-h-[3.6em] overflow-y-auto text-left scrollbar-thin scrollbar-thumb-green-300 scrollbar-track-transparent">
                        <span className="text-xs md:text-sm text-gray-900 break-words hyphens-auto leading-tight font-medium block">{item.text}</span>
                      </div>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="flex items-center justify-between mt-3 gap-2">
        <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
          <span className="text-gray-900 font-bold text-base">
            {timeRemaining !== null ? formatTime(timeRemaining) : "00:00"}
          </span>
        </div>
        <div className="bg-white/20 backdrop-blur-sm p-2 md:p-3 rounded-xl text-center text-xs md:text-sm text-white shadow-lg flex-1">
          {isMobile 
            ? "Toca un item de la izquierda, luego su par de la derecha"
            : "Arrastra desde un item de la izquierda hasta su par de la derecha"
          }
        </div>
      </div>
    </div>
  );
};
