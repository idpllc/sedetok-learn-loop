import { useState, useEffect } from "react";
import { useTriviaMatch, TriviaMatchPlayer } from "@/hooks/useTriviaMatch";
import { TriviaQuestion } from "@/hooks/useTriviaGame";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { TriviaWheel } from "./TriviaWheel";
import { TriviaCharacterRound } from "./TriviaCharacterRound";
import { StreakIndicator } from "./StreakIndicator";
import { Trophy, Clock, Target, LogOut } from "lucide-react";
import confetti from "canvas-confetti";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface TriviaMatch1v1Props {
  matchId: string;
}

type GamePhase = 'wheel' | 'questions' | 'character-round' | 'finished';

export function TriviaMatch1v1({ matchId }: TriviaMatch1v1Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { match, players, updatePlayer, recordTurn, updateMatch, fetchQuestions } = useTriviaMatch(matchId);
  
  const [phase, setPhase] = useState<GamePhase>('wheel');
  const [currentCategory, setCurrentCategory] = useState<any>(null);
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [turnEnded, setTurnEnded] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['trivia-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trivia_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const currentPlayer = players?.find(p => p.user_id === user?.id);
  const opponent = players?.find(p => p.user_id !== user?.id);
  const isMyTurn = match?.current_player_id === user?.id && !turnEnded;
  const currentQuestion = questions[currentQuestionIndex];
  const waitingForOpponent = !opponent;
  const matchIsWaiting = match?.status === 'waiting';

  // Reset turnEnded when it actually becomes our turn
  useEffect(() => {
    if (match?.current_player_id === user?.id) {
      setTurnEnded(false);
    }
  }, [match?.current_player_id, user?.id]);

  // Activate match when second player joins
  useEffect(() => {
    const activateMatch = async () => {
      if (matchIsWaiting && opponent && match) {
        // Update match to active status
        await updateMatch.mutateAsync({
          status: 'active',
          started_at: new Date().toISOString(),
          current_player_id: currentPlayer?.user_id || user?.id
        });
      }
    };
    activateMatch();
  }, [matchIsWaiting, opponent, match?.id]);

  // Timer
  useEffect(() => {
    if (phase === 'questions' && isMyTurn && timeLeft > 0 && !selectedAnswer) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && phase === 'questions' && !selectedAnswer) {
      handleTimeout();
    }
  }, [timeLeft, phase, isMyTurn, selectedAnswer]);

  // Check for winner
  useEffect(() => {
    if (currentPlayer && currentPlayer.characters_collected.length === 6) {
      handleWin();
    }
    if (opponent && opponent.characters_collected.length === 6) {
      handleLoss();
    }
  }, [currentPlayer?.characters_collected, opponent?.characters_collected]);

  const handleCategorySelected = async (category: any) => {
    setCurrentCategory(category);
    const qs = await fetchQuestions(category.id, match?.level || 'libre');
    setQuestions(qs);
    setCurrentQuestionIndex(0);
    setTimeLeft(20);
    
    await updateMatch.mutateAsync({
      current_category_id: category.id,
      current_question_number: 0
    });

    setTimeout(() => setPhase('questions'), 1500);
  };

  const handleAnswer = async (optionIndex: number) => {
    if (!isMyTurn || selectedAnswer !== null) return;

    setSelectedAnswer(optionIndex);
    const isCorrect = currentQuestion.options[optionIndex]?.is_correct || false;
    const newStreak = isCorrect ? currentStreak + 1 : 0;
    setCurrentStreak(newStreak);

    // Record turn
    await recordTurn.mutateAsync({
      match_id: matchId,
      player_id: user!.id,
      category_id: currentCategory.id,
      question_id: currentQuestion.id,
      answer_correct: isCorrect,
      time_taken: 20 - timeLeft,
      streak_at_answer: newStreak
    });

    setShowFeedback(true);

    setTimeout(() => {
      setShowFeedback(false);
      setSelectedAnswer(null);
      
      if (!isCorrect) {
        // Lost turn - reset streak and change turn
        setCurrentStreak(0);
        setCurrentQuestionIndex(0);
        setQuestions([]);
        setCurrentCategory(null);
        setTurnEnded(true); // Block interaction immediately
        changeTurn();
      } else if (newStreak === 3) {
        // Won the right to character round after 3 correct answers (global streak)
        setPhase('character-round');
      } else {
        // Correct answer - return to wheel to select new category
        setCurrentQuestionIndex(0);
        setQuestions([]);
        setCurrentCategory(null);
        setTimeLeft(20);
        setPhase('wheel');
      }
    }, 2000);
  };

  const handleTimeout = () => {
    // Reset state when timeout occurs
    setSelectedAnswer(null);
    setShowFeedback(false);
    setCurrentQuestionIndex(0);
    setQuestions([]);
    setCurrentCategory(null);
    setTurnEnded(true); // Block interaction immediately
    changeTurn();
  };

  const changeTurn = async () => {
    // If there's no opponent yet, stay on current player's turn
    const nextPlayerId = opponent?.user_id || user?.id;
    await updateMatch.mutateAsync({
      current_player_id: nextPlayerId,
      current_question_number: 0
    });
    setPhase('wheel');
    setSelectedAnswer(null);
    setTimeLeft(20);
    setShowFeedback(false);
  };

  const handleCharacterWon = async (categoryId: string, stolen: boolean = false) => {
    let newCharacters = [...(currentPlayer?.characters_collected || [])];
    
    if (stolen && opponent) {
      // Remove from opponent
      const opponentChars = opponent.characters_collected.filter(c => c !== categoryId);
      await updatePlayer.mutateAsync({
        playerId: opponent.id,
        characters: opponentChars
      });
    }
    
    if (!newCharacters.includes(categoryId)) {
      newCharacters.push(categoryId);
    }

    await updatePlayer.mutateAsync({
      playerId: currentPlayer!.id,
      characters: newCharacters,
      streak: 0
    });

    await recordTurn.mutateAsync({
      match_id: matchId,
      player_id: user!.id,
      category_id: currentCategory.id,
      question_id: currentQuestion.id,
      answer_correct: true,
      time_taken: 20 - timeLeft,
      streak_at_answer: 3,
      character_won: categoryId
    });

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    setCurrentStreak(0);
    await changeTurn();
  };

  const handleCharacterRoundFailed = async () => {
    setCurrentStreak(0);
    await changeTurn();
  };

  const handleWin = async () => {
    await updateMatch.mutateAsync({
      status: 'finished',
      winner_id: user!.id,
      finished_at: new Date().toISOString()
    });
    setPhase('finished');
    
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.5 }
    });
  };

  const handleLoss = () => {
    setPhase('finished');
  };

  if (!match || !players || !categories) {
    return <div>Cargando...</div>;
  }

  // Finished screen
  if (phase === 'finished') {
    const winner = players.find(p => p.user_id === match.winner_id);
    const isWinner = winner?.user_id === user?.id;

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Card className="max-w-2xl w-full text-center">
            <CardContent className="pt-8 space-y-6">
              <div className="text-8xl mb-4">
                {isWinner ? "🏆" : "😔"}
              </div>
              
              <h2 className="text-4xl font-bold">
                {isWinner ? "¡Victoria!" : "Derrota"}
              </h2>

              <p className="text-xl text-muted-foreground">
                {isWinner 
                  ? "¡Completaste todos los personajes!" 
                  : `${winner?.profiles?.username} completó todos los personajes`}
              </p>

              <Button size="lg" onClick={() => window.location.reload()}>
                Volver al Menú
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Exit button component (always visible)
  const ExitButton = () => (
    <div className="container max-w-4xl mx-auto pt-4 px-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const confirmExit = window.confirm('¿Estás seguro de que quieres salir de la partida?');
          if (confirmExit) {
            window.location.href = '/trivia-game';
          }
        }}
        className="mb-4"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Salir
      </Button>
    </div>
  );

  // Wheel phase
  if (phase === 'wheel') {
    return (
      <div className="min-h-screen">
        <ExitButton />
        <PlayerStats 
          currentPlayer={currentPlayer!} 
          opponent={opponent!} 
          categories={categories}
        />
        <StreakIndicator streak={currentStreak} />
        {!isMyTurn && opponent && (
          <div className="container max-w-4xl mx-auto text-center mb-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold text-muted-foreground">
                  Turno de {opponent.profiles?.username}
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Espera a que termine su turno...
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        <TriviaWheel
          categories={categories}
          onCategorySelected={handleCategorySelected}
          disabled={!isMyTurn}
        />
      </div>
    );
  }

  // Character round
  if (phase === 'character-round' && isMyTurn) {
    return (
      <div className="min-h-screen p-4">
        <ExitButton />
        <PlayerStats 
          currentPlayer={currentPlayer!} 
          opponent={opponent!} 
          categories={categories}
        />
        <StreakIndicator streak={3} />
        <TriviaCharacterRound
          categories={categories}
          currentPlayerCharacters={currentPlayer?.characters_collected || []}
          opponentCharacters={opponent?.characters_collected || []}
          level={match.level}
          onCharacterWon={handleCharacterWon}
          onSkip={handleCharacterRoundFailed}
        />
      </div>
    );
  }

  // Questions phase
  if (phase === 'questions' && currentQuestion) {
    return (
      <div className="min-h-screen p-4 space-y-4">
        <ExitButton />
        <PlayerStats 
          currentPlayer={currentPlayer!} 
          opponent={opponent!} 
          categories={categories}
        />

        <StreakIndicator streak={currentStreak} />

        <Card className="max-w-3xl mx-auto">
          <CardContent className="pt-6 space-y-6">
            {/* Category and timer */}
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {currentCategory?.icon} {currentCategory?.name}
              </Badge>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span className="text-2xl font-bold">{timeLeft}s</span>
              </div>
            </div>


            {/* Question */}
            <div className="text-center space-y-6">
              <h3 className="text-2xl font-bold">
                {currentQuestion.question_text}
              </h3>

              {currentQuestion.image_url && (
                <img
                  src={currentQuestion.image_url}
                  alt="Question"
                  className="max-w-md mx-auto rounded-lg"
                />
              )}

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options?.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const showCorrect = showFeedback && option.is_correct;
                  const showIncorrect = showFeedback && isSelected && !option.is_correct;
                  
                  return (
                    <Button
                      key={index}
                      size="lg"
                      variant="outline"
                      onClick={() => handleAnswer(index)}
                      disabled={!isMyTurn || selectedAnswer !== null}
                      className={`h-auto py-4 px-6 text-lg whitespace-normal font-semibold ${
                        showCorrect ? '!bg-green-500 !hover:bg-green-600 !text-white !border-green-600' : 
                        showIncorrect ? '!bg-red-500 !hover:bg-red-600 !text-white !border-red-600' : 
                        'bg-card text-foreground border-2'
                      }`}
                    >
                      <span className="block w-full text-center">
                        {option.option_text}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Waiting for turn or opponent
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <ExitButton />
      {currentPlayer && opponent && (
        <PlayerStats 
          currentPlayer={currentPlayer} 
          opponent={opponent} 
          categories={categories}
        />
      )}
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 text-center space-y-4">
          <div className="text-6xl mb-4">
            {waitingForOpponent ? "🔍" : "⏳"}
          </div>
          <h2 className="text-2xl font-bold">
            {waitingForOpponent 
              ? "Buscando oponente..." 
              : `Turno de ${opponent?.profiles?.username}`}
          </h2>
          <p className="text-muted-foreground">
            {waitingForOpponent 
              ? "Otro jugador se unirá pronto" 
              : "Espera tu turno..."}
          </p>
          <Button 
            variant="outline" 
            onClick={() => {
              const confirmExit = window.confirm('¿Estás seguro de que quieres salir de la partida?');
              if (confirmExit) {
                window.location.href = '/trivia-game';
              }
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Salir de la partida
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PlayerStats({ 
  currentPlayer, 
  opponent, 
  categories 
}: { 
  currentPlayer: TriviaMatchPlayer; 
  opponent: TriviaMatchPlayer | undefined;
  categories: any[];
}) {
  return (
    <div className="container max-w-4xl mx-auto mb-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Current Player */}
        <Card className="bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar>
                <AvatarImage src={currentPlayer.profiles?.avatar_url || undefined} />
                <AvatarFallback>
                  {currentPlayer.profiles?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{currentPlayer.profiles?.username}</p>
                <p className="text-sm text-muted-foreground">Tú</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {categories?.map(cat => (
                <div
                  key={cat.id}
                  className={`text-2xl ${
                    currentPlayer.characters_collected.includes(cat.id)
                      ? 'opacity-100'
                      : 'opacity-20 grayscale'
                  }`}
                  title={cat.name}
                >
                  {cat.icon}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Opponent */}
        <Card className="bg-secondary/5">
          <CardContent className="pt-4">
            {opponent ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar>
                    <AvatarImage src={opponent.profiles?.avatar_url || undefined} />
                    <AvatarFallback>
                      {opponent.profiles?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{opponent.profiles?.username}</p>
                    <p className="text-sm text-muted-foreground">Oponente</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {categories?.map(cat => (
                    <div
                      key={cat.id}
                      className={`text-2xl ${
                        opponent.characters_collected.includes(cat.id)
                          ? 'opacity-100'
                          : 'opacity-20 grayscale'
                      }`}
                      title={cat.name}
                    >
                      {cat.icon}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground text-center">
                  Esperando oponente...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
