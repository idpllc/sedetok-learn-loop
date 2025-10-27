import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
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
  onComplete: (score: number, maxScore: number) => void;
}

export const InteractiveImageViewer = ({
  imageUrl,
  points,
  maxLives = 5,
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
  const imageRef = useRef<HTMLDivElement>(null);
  const { playCorrect, playLoseLife, playVictory } = useGameSounds();

  const currentPoint = points[currentQuestionIndex];
  const score = correctAnswers.length * 100;
  const maxScore = points.length * 100;

  useEffect(() => {
    if (lives <= 0 || currentQuestionIndex >= points.length) {
      setGameOver(true);
      playVictory();
      onComplete(score, maxScore);
    }
  }, [lives, currentQuestionIndex, points.length, score, maxScore, onComplete, playVictory]);

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

  // Verify currentQuestionIndex is valid
  if (!points[currentQuestionIndex]) {
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

    const isCorrect = clickedPointId === currentPoint.id;

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
      setLives(lives - (currentPoint.lives_cost || 1));
      setWrongPointClicks([...wrongPointClicks, clickedPointId]);
      // Remove the wrong indicator after 1 second
      setTimeout(() => {
        setWrongPointClicks(prev => prev.filter(id => id !== clickedPointId));
      }, 1000);
    }
  };

  if (gameOver) {
    const percentage = (score / maxScore) * 100;
    return (
      <Card className="p-8">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold mb-4">¡Juego Terminado!</h2>
          <div className="text-6xl font-bold mb-4 text-primary">
            {score}/{maxScore}
          </div>
          <p className="text-xl mb-2">
            {percentage >= 80
              ? "¡Excelente trabajo!"
              : percentage >= 60
              ? "¡Buen intento!"
              : "Sigue practicando"}
          </p>
          <p className="text-muted-foreground">
            Respondiste correctamente {correctAnswers.length} de {points.length} preguntas
          </p>
        </div>

        {feedbackHistory.length > 0 && (
          <div className="space-y-4 mt-8">
            <h3 className="text-xl font-semibold mb-4">Retroalimentación</h3>
            {feedbackHistory.map((item, index) => (
              <div key={index} className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">{item.question}</h4>
                <p className="text-sm text-muted-foreground">{item.feedback}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Array.from({ length: maxLives }).map((_, i) => (
            <Heart
              key={i}
              className={`w-6 h-6 ${
                i < lives ? "text-red-500 fill-red-500" : "text-muted"
              }`}
            />
          ))}
        </div>
        <div className="text-lg font-semibold">
          Pregunta {currentQuestionIndex + 1}/{points.length}
        </div>
        <div className="text-lg font-semibold">Puntos: {score}</div>
      </div>

      <Card className="p-6">
        <h2 className="text-2xl font-bold text-center mb-6">{currentPoint.question}</h2>
        <p className="text-center text-muted-foreground mb-4">
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
            
            return (
              <button
                key={point.id}
                className={`absolute w-10 h-10 -ml-5 -mt-5 rounded-full border-3 flex items-center justify-center font-bold text-sm shadow-lg ${
                  isZoomed
                    ? "bg-green-500 text-white border-white scale-150 z-20 transition-transform duration-500 ease-out"
                    : isWrongClick
                    ? "bg-red-500 text-white border-white scale-110 z-10 transition-all duration-300"
                    : isAnswered
                    ? "bg-gray-400 text-white border-white opacity-50 cursor-not-allowed transition-all duration-300"
                    : "bg-blue-500 text-white border-white hover:scale-110 hover:bg-blue-600 cursor-pointer z-10 transition-all duration-300"
                }`}
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`,
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
