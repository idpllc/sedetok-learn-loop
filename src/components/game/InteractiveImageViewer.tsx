import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, CheckCircle2, XCircle, ArrowRight, Clock, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { useGameSounds } from "@/hooks/useGameSounds";

interface InteractivePoint {
  id: string;
  x: number;
  y: number;
  question: string;
  feedback?: string;
  lives_cost: number;
}

interface InteractiveImageViewerProps {
  imageUrl: string;
  points: InteractivePoint[];
  maxLives?: number;
  timeLimit?: number;
  onComplete: (score: number, maxScore: number) => void;
}

export const InteractiveImageViewer = ({
  imageUrl,
  points,
  maxLives = 5,
  timeLimit,
  onComplete,
}: InteractiveImageViewerProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [lives, setLives] = useState(maxLives);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [wrongPointClicks, setWrongPointClicks] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [zoomedPoint, setZoomedPoint] = useState<string | null>(null);
  const [feedbackHistory, setFeedbackHistory] = useState<Array<{question: string, feedback: string}>>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(timeLimit || null);
  const imageRef = useRef<HTMLDivElement>(null);
  const { playCorrect, playLoseLife, playVictory } = useGameSounds();

  // Normalize score to 100 points maximum
  const score = points.length > 0 ? Math.round((correctAnswers.length / points.length) * 100) : 0;
  const maxScore = 100;

  useEffect(() => {
    if (lives <= 0 || currentQuestionIndex >= points.length) {
      setGameOver(true);
      playVictory();
      // Don't call onComplete here - wait for user to close the results screen
    }
  }, [lives, currentQuestionIndex, points.length, playVictory]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0 && !gameOver) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            setGameOver(true);
            playVictory();
            // Don't call onComplete here - wait for user to close the results screen
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, gameOver, playVictory]);

  // Early return if no points available
  if (!points || points.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">No hay puntos configurados</h2>
        <p className="text-muted-foreground">
          Este juego aún no tiene puntos de interacción configurados.
        </p>
      </Card>
    );
  }

  // Show game over screen
  if (gameOver) {
    return (
      <Card className="p-12 max-w-md mx-auto">
        <div className="text-center space-y-6">
          <div className="flex justify-center mb-4">
            <Trophy className="w-24 h-24 text-yellow-500" />
          </div>
          <h2 className="text-4xl font-bold">¡Juego Completado!</h2>
          <div className="space-y-2">
            <div className="text-7xl font-bold" style={{ color: 'hsl(var(--primary))' }}>
              {score}/100
            </div>
            <p className="text-2xl text-muted-foreground">
              {score >= 80
                ? "¡Excelente!"
                : score >= 60
                ? "¡Aprobado!"
                : "Sigue practicando"}
            </p>
          </div>
          {feedbackHistory.length > 0 && (
            <div className="space-y-4 mt-8 text-left">
              <h3 className="text-xl font-semibold text-center">Retroalimentación</h3>
              {feedbackHistory.map((item, index) => (
                <div key={index} className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">{item.question}</h4>
                  <p className="text-sm text-muted-foreground">{item.feedback}</p>
                </div>
              ))}
            </div>
          )}
          <Button 
            onClick={() => onComplete(score, maxScore)} 
            size="lg" 
            className="w-full mt-6"
          >
            Cerrar
          </Button>
        </div>
      </Card>
    );
  }

  const currentPoint = points[currentQuestionIndex];
  
  // Verify currentQuestionIndex is valid only if not game over
  if (!currentPoint) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Error en el juego</h2>
        <p className="text-muted-foreground">
          No se puede cargar la pregunta actual.
        </p>
      </Card>
    );
  }


  const handlePointClick = (clickedPointId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (gameOver || showFeedback || zoomedPoint) return;

    const isCorrect = clickedPointId === currentPoint?.id;

    if (isCorrect) {
      playCorrect();
      setCorrectAnswers([...correctAnswers, currentPoint.id]);
      setZoomedPoint(clickedPointId);
      
      // Save feedback for later
      if (currentPoint.feedback) {
        setFeedbackHistory([...feedbackHistory, {
          question: currentPoint.question,
          feedback: currentPoint.feedback
        }]);
      }
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      // Auto advance after zoom animation
      setTimeout(() => {
        setZoomedPoint(null);
        setWrongPointClicks([]);
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }, 1500);
    } else {
      playLoseLife();
      setLives(lives - (currentPoint?.lives_cost || 1));
      setWrongPointClicks([...wrongPointClicks, clickedPointId]);
      // Remove the wrong indicator after 1 second
      setTimeout(() => {
        setWrongPointClicks(prev => prev.filter(id => id !== clickedPointId));
      }, 1000);
    }
  };


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2 md:gap-4 pr-12 md:pr-16">
        <div className="flex items-center gap-1 md:gap-2">
          {Array.from({ length: maxLives }).map((_, i) => (
            <Heart
              key={i}
              className={`w-4 h-4 md:w-6 md:h-6 ${
                i < lives ? "text-red-500 fill-red-500" : "text-muted"
              }`}
            />
          ))}
        </div>
        <div className="text-sm md:text-lg font-semibold">
          {currentQuestionIndex + 1}/{points.length}
        </div>
        {timeRemaining !== null && (
          <div className="flex items-center gap-1 md:gap-2 text-sm md:text-lg font-semibold">
            <Clock className="w-4 h-4 md:w-5 md:h-5" />
            {formatTime(timeRemaining)}
          </div>
        )}
        <div className="text-sm md:text-lg font-semibold">Pts: {score}</div>
      </div>

      <Card className="p-3 md:p-6">
        <h2 className="text-lg md:text-2xl font-bold text-center mb-2 md:mb-3">{currentPoint.question}</h2>
        {currentPoint.feedback && (
          <div className="mx-auto max-w-[900px] text-center mb-2 md:mb-4 p-2 md:p-3 bg-muted rounded-md border">
            <p className="text-xs md:text-sm text-muted-foreground">{currentPoint.feedback}</p>
          </div>
        )}
        <p className="text-center text-xs md:text-base text-muted-foreground mb-3 md:mb-4">
          Pulsa en el punto que corresponda
        </p>

        <div
          ref={imageRef}
          className="relative w-full bg-muted rounded-lg overflow-hidden"
          style={{ aspectRatio: aspectRatio || 16 / 9 }}
        >
          <img
            src={imageUrl}
            alt="Interactive game"
            className="w-full h-full object-contain pointer-events-none"
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) {
                setAspectRatio(img.naturalWidth / img.naturalHeight);
              }
            }}
          />

          {/* Show all points as clickable buttons */}
          {points.map((point, index) => {
            const isCurrentPoint = point.id === currentPoint.id;
            const isAnswered = correctAnswers.includes(point.id);
            const isWrongClick = wrongPointClicks.includes(point.id);
            const isZoomed = zoomedPoint === point.id;
            
            // Calculate z-index to prevent overlap (higher index = higher z-index for unclicked points)
            const baseZIndex = isZoomed ? 50 : isWrongClick ? 40 : isAnswered ? 5 : 10 + index;
            
            return (
              <button
                key={point.id}
                className={`absolute w-10 h-10 -ml-5 -mt-5 rounded-full border-3 flex items-center justify-center font-bold text-sm shadow-lg ${
                  isZoomed
                    ? "bg-green-500 text-white border-white scale-150 transition-transform duration-500 ease-out"
                    : isWrongClick
                    ? "bg-red-500 text-white border-white scale-110 transition-all duration-300"
                    : isAnswered
                    ? "bg-gray-400 text-white border-white opacity-50 cursor-not-allowed transition-all duration-300"
                    : "bg-blue-500 text-white border-white hover:scale-110 hover:bg-blue-600 cursor-pointer transition-all duration-300"
                }`}
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  zIndex: baseZIndex,
                }}
                onClick={(e) => !isAnswered && !zoomedPoint && handlePointClick(point.id, e)}
                disabled={isAnswered || zoomedPoint !== null}
              >
                {isZoomed ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : isWrongClick ? (
                  <XCircle className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </button>
            );
          })}
        </div>

      </Card>
    </div>
  );
};
