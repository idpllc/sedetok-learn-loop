import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Trophy, Swords, Clock } from "lucide-react";
import { useTriviaMatch } from "@/hooks/useTriviaMatch";
import { TriviaQuestion } from "@/hooks/useTriviaGame";

interface TriviaCharacterRoundProps {
  categories: any[];
  currentPlayerCharacters: string[];
  opponentCharacters: string[];
  level: string;
  onCharacterWon: (categoryId: string, stolen: boolean) => void;
  onSkip: () => void;
}

export function TriviaCharacterRound({
  categories,
  currentPlayerCharacters,
  opponentCharacters,
  level,
  onCharacterWon,
  onSkip
}: TriviaCharacterRoundProps) {
  const { fetchQuestions } = useTriviaMatch();
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [question, setQuestion] = useState<TriviaQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [showFeedback, setShowFeedback] = useState(false);

  // Timer
  useEffect(() => {
    if (question && timeLeft > 0 && selectedAnswer === null) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !selectedAnswer) {
      handleTimeout();
    }
  }, [question, timeLeft, selectedAnswer]);

  const handleCategorySelect = async (category: any) => {
    setSelectedCategory(category);
    const questions = await fetchQuestions(category.id, level);
    if (questions.length > 0) {
      const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
      setQuestion(randomQuestion);
    }
  };

  const handleAnswer = (optionIndex: number) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(optionIndex);
    const isCorrect = question?.options[optionIndex]?.is_correct || false;
    setShowFeedback(true);

    setTimeout(() => {
      if (isCorrect) {
        const stolen = currentPlayerCharacters.includes(selectedCategory.id);
        onCharacterWon(selectedCategory.id, stolen);
      } else {
        onSkip();
      }
    }, 2000);
  };

  const handleTimeout = () => {
    onSkip();
  };

  // Category selection
  if (!selectedCategory) {
    const availableToWin = categories.filter(
      cat => !currentPlayerCharacters.includes(cat.id)
    );
    const availableToSteal = categories.filter(
      cat => opponentCharacters.includes(cat.id) && currentPlayerCharacters.includes(cat.id)
    );

    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-3xl mx-auto"
      >
        <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
          <CardContent className="pt-8 space-y-6">
            <div className="text-center">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
              <h2 className="text-3xl font-bold mb-2">¡Ronda de Personaje!</h2>
              <p className="text-muted-foreground">
                ¡Conseguiste 3 respuestas correctas! Elige una categoría para ganar su personaje
              </p>
            </div>

            {availableToWin.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Personajes Disponibles
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableToWin.map(cat => (
                    <Button
                      key={cat.id}
                      variant="outline"
                      className="h-auto py-4 flex flex-col gap-2"
                      onClick={() => handleCategorySelect(cat)}
                    >
                      <span className="text-4xl">{cat.icon}</span>
                      <span className="text-sm font-semibold">{cat.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {availableToSteal.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Swords className="w-5 h-5" />
                  Robar del Oponente
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableToSteal.map(cat => (
                    <Button
                      key={cat.id}
                      variant="destructive"
                      className="h-auto py-4 flex flex-col gap-2"
                      onClick={() => handleCategorySelect(cat)}
                    >
                      <span className="text-4xl">{cat.icon}</span>
                      <span className="text-sm font-semibold">{cat.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <Button variant="ghost" onClick={onSkip} className="w-full">
              Saltar Ronda
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Question
  if (question) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-3xl mx-auto"
      >
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {selectedCategory.icon} {selectedCategory.name}
              </Badge>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span className="text-2xl font-bold">{timeLeft}s</span>
              </div>
            </div>

            <div className="text-center">
              <Trophy className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
              <p className="text-sm text-muted-foreground mb-4">
                Pregunta Especial - ¡Responde correctamente para ganar el personaje!
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-center">
                {question.question_text}
              </h3>

              {question.image_url && (
                <img
                  src={question.image_url}
                  alt="Question"
                  className="max-w-md mx-auto rounded-lg"
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {question.options?.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const showCorrect = showFeedback && option.is_correct;
                  const showIncorrect = showFeedback && isSelected && !option.is_correct;
                  
                  return (
                    <Button
                      key={index}
                      size="lg"
                      variant="outline"
                      onClick={() => handleAnswer(index)}
                      disabled={selectedAnswer !== null}
                      className={`h-auto py-4 px-6 text-lg whitespace-normal font-semibold ${
                        showCorrect ? '!bg-green-500 hover:!bg-green-600 !text-white !border-green-600' : 
                        showIncorrect ? '!bg-red-500 hover:!bg-red-600 !text-white !border-red-600' : 
                        'bg-card text-foreground border-2'
                      }`}
                    >
                      <span className="block w-full text-center">
                        {option.option_text || `Opción ${index + 1}`}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return null;
}
