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
  const [incorrectClicks, setIncorrectClicks] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [gameOver, setGameOver] = useState(false);
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

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || gameOver || showFeedback) return;

    const rect = imageRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const tolerance = 5; // 5% tolerance for clicking near the point
    const isCorrect =
      Math.abs(clickX - currentPoint.x) < tolerance &&
      Math.abs(clickY - currentPoint.y) < tolerance;

    if (isCorrect) {
      playCorrect();
      setCorrectAnswers([...correctAnswers, currentPoint.id]);
      setShowFeedback(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } else {
      playLoseLife();
      setLives(lives - (currentPoint.lives_cost || 1));
      setIncorrectClicks([...incorrectClicks, `${clickX}-${clickY}`]);
    }
  };

  const handleNext = () => {
    setShowFeedback(false);
    setCurrentQuestionIndex(currentQuestionIndex + 1);
  };

  if (gameOver) {
    const percentage = (score / maxScore) * 100;
    return (
      <Card className="p-8 text-center">
        <h2 className="text-3xl font-bold mb-4">¡Juego Terminado!</h2>
        <div className="text-6xl font-bold mb-4 text-primary">
          {score}/{maxScore}
        </div>
        <p className="text-xl mb-6">
          {percentage >= 80
            ? "¡Excelente trabajo!"
            : percentage >= 60
            ? "¡Buen intento!"
            : "Sigue practicando"}
        </p>
        <p className="text-muted-foreground">
          Respondiste correctamente {correctAnswers.length} de {points.length} preguntas
        </p>
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
          className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden cursor-crosshair"
          onClick={handleImageClick}
        >
          <img
            src={imageUrl}
            alt="Interactive game"
            className="w-full h-full object-contain pointer-events-none"
          />

          {/* Show correct point when answer is revealed */}
          {showFeedback && (
            <div
              className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full bg-green-500 border-4 border-white animate-pulse z-20 flex items-center justify-center"
              style={{
                left: `${currentPoint.x}%`,
                top: `${currentPoint.y}%`,
              }}
            >
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
          )}

          {/* Show incorrect clicks */}
          {incorrectClicks.map((click, index) => {
            const [x, y] = click.split("-").map(Number);
            return (
              <div
                key={index}
                className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full bg-red-500/50 border-2 border-red-500 animate-ping"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  animationIterationCount: 1,
                }}
              >
                <XCircle className="w-full h-full text-white" />
              </div>
            );
          })}
        </div>

        {showFeedback && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                  ¡Correcto!
                </h3>
                {currentPoint.feedback && (
                  <p className="text-sm text-green-800 dark:text-green-200">
                    {currentPoint.feedback}
                  </p>
                )}
              </div>
            </div>
            <Button onClick={handleNext} className="w-full mt-4" size="lg">
              {currentQuestionIndex < points.length - 1 ? (
                <>
                  Siguiente pregunta <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                "Ver resultados"
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
