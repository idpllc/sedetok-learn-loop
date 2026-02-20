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
import { useGameSounds } from "@/hooks/useGameSounds";
import { useToast } from "@/hooks/use-toast";

interface TriviaMatch1v1Props {
  matchId: string;
}

type GamePhase = 'wheel' | 'questions' | 'character-round' | 'finished';

export function TriviaMatch1v1({ matchId }: TriviaMatch1v1Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { match, players, updatePlayer, recordTurn, updateMatch, fetchQuestions } = useTriviaMatch(matchId);
  const { playCorrect, playWrong, playQuestionAppear, playTimeWarning } = useGameSounds();
  
  const [phase, setPhase] = useState<GamePhase>('wheel');
  const [currentCategory, setCurrentCategory] = useState<any>(null);
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [turnEnded, setTurnEnded] = useState(false);
  const [charactersWonThisTurn, setCharactersWonThisTurn] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [incorrectAnswers, setIncorrectAnswers] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

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

  // Reset turnEnded and charactersWonThisTurn when it actually becomes our turn and send notification
  useEffect(() => {
    if (match?.current_player_id === user?.id) {
      setTurnEnded(false);
      setCharactersWonThisTurn(0);
      setCurrentStreak(0);
      
      // Send push notification when it becomes my turn
      const sendTurnNotification = async () => {
        try {
          // Create notification in database
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: user.id,
              type: 'trivia_turn',
              title: '¡Es tu turno!',
              message: 'Es tu turno en la partida de trivia',
              related_id: matchId,
              related_type: 'trivia_match',
              read: false
            });

          if (notifError) {
            console.error('Error creating notification:', notifError);
          }

          // Send push notification
          const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
            body: {
              userId: user.id,
              title: '¡Es tu turno!',
              message: 'Es tu turno en la partida de trivia',
              url: `/trivia-game?match=${matchId}`,
              notificationId: matchId,
              relatedId: matchId,
              relatedType: 'trivia_match'
            }
          });

          if (pushError) {
            console.error('Error sending push notification:', pushError);
          }

          // Show toast notification
          toast({
            title: "¡Es tu turno!",
            description: "Es tu turno en la partida de trivia",
          });
        } catch (error) {
          console.error('Error sending turn notification:', error);
        }
      };

      // Only send notification if we're not in the initial state
      if (match?.started_at) {
        sendTurnNotification();
      }
    }
  }, [match?.current_player_id, user?.id, matchId, toast]);

  // Activate match when second player joins
  useEffect(() => {
    const activateMatch = async () => {
      if (matchIsWaiting && opponent && match && players && players.length === 2) {
        // Update match to active status - first player starts
        const firstPlayer = players.find(p => p.player_number === 1);
        await updateMatch.mutateAsync({
          status: 'active',
          started_at: new Date().toISOString(),
          current_player_id: firstPlayer?.user_id || players[0]?.user_id
        });
      }
    };
    activateMatch();
  }, [matchIsWaiting, opponent, match?.id, players?.length]);

  // Timer
  useEffect(() => {
    if (phase === 'questions' && isMyTurn && timeLeft > 0 && !selectedAnswer) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      // Play warning sound at 5 seconds
      if (timeLeft === 5) {
        playTimeWarning();
      }
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
    console.log('🎯 Categoría seleccionada:', {
      id: category.id,
      name: category.name,
      icon: category.icon
    });
    
    setCurrentCategory(category);
    const qs = await fetchQuestions(category.id, match?.level || 'libre');
    
    console.log('📝 Preguntas obtenidas:', {
      cantidad: qs.length,
      categoryId: category.id,
      primerasPreguntasCategoryIds: qs.slice(0, 3).map(q => ({ 
        id: q.id, 
        category_id: q.category_id,
        question: q.question_text.substring(0, 50) 
      }))
    });
    
    setQuestions(qs);
    setCurrentQuestionIndex(0);
    setTimeLeft(20);
    
    await updateMatch.mutateAsync({
      current_category_id: category.id,
      current_question_number: 0
    });

    setTimeout(() => {
      setPhase('questions');
      playQuestionAppear();
    }, 1500);
  };

  const handleAnswer = async (optionIndex: number) => {
    if (!isMyTurn || selectedAnswer !== null) return;

    setSelectedAnswer(optionIndex);
    const isCorrect = currentQuestion.options[optionIndex]?.is_correct || false;
    const newStreak = isCorrect ? currentStreak + 1 : 0;
    setCurrentStreak(newStreak);

    // Track answers
    if (isCorrect) {
      playCorrect();
      setCorrectAnswers(prev => prev + 1);
      setMaxStreak(prev => Math.max(prev, newStreak));
    } else {
      playWrong();
      setIncorrectAnswers(prev => prev + 1);
    }

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

    setTimeout(async () => {
      setShowFeedback(false);
      setSelectedAnswer(null);
      
      if (!isCorrect) {
        // Lost turn - reset streak and change turn
        setCurrentStreak(0);
        setCurrentQuestionIndex(0);
        setQuestions([]);
        setCurrentCategory(null);
        setTurnEnded(true); // Block interaction immediately
        
        // Send turn notification to opponent
        await sendTurnNotification();
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

  const handleTimeout = async () => {
    // Reset state when timeout occurs
    setSelectedAnswer(null);
    setShowFeedback(false);
    setCurrentQuestionIndex(0);
    setQuestions([]);
    setCurrentCategory(null);
    setTurnEnded(true); // Block interaction immediately
    
    // Send email notification to opponent
    await sendTurnNotification();
    changeTurn();
  };

  const sendTurnNotification = async () => {
    if (opponent?.user_id) {
      try {
        console.log('Sending turn notification to opponent:', opponent.user_id);
        const { error } = await supabase.functions.invoke('send-trivia-turn-email', {
          body: {
            opponentId: opponent.user_id,
            failedPlayerUsername: currentPlayer?.profiles?.username || 'Un jugador',
            matchId: matchId
          }
        });
        
        if (error) {
          console.error('Error sending turn notification:', error);
        } else {
          console.log('Turn notification sent successfully');
        }
      } catch (error) {
        console.error('Exception sending turn notification:', error);
      }
    }
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
    setCharactersWonThisTurn(0);
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

    const newCharactersCount = charactersWonThisTurn + 1;
    setCharactersWonThisTurn(newCharactersCount);
    setCurrentStreak(0);

    // Only change turn after winning 3 characters
    if (newCharactersCount >= 3) {
      setCharactersWonThisTurn(0);
      await changeTurn();
    } else {
      // Continue playing - return to wheel
      setPhase('wheel');
      setCurrentQuestionIndex(0);
      setQuestions([]);
      setCurrentCategory(null);
      setTimeLeft(20);
      
      toast({
        title: `¡Personaje ganado! ${newCharactersCount}/3`,
        description: `Puedes ganar ${3 - newCharactersCount} personaje(s) más antes de ceder el turno`,
      });
    }
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
    
    // Update user stats
    if (currentPlayer) {
      const { data: stats } = await supabase
        .from('trivia_user_stats')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      
      const victoryPoints = 100;
      const newTotalPoints = (stats?.total_points || 0) + victoryPoints;
      const newTotalMatches = (stats?.total_matches || 0) + 1;
      const newTotalCorrect = (stats?.total_correct || 0) + correctAnswers;
      const newTotalIncorrect = (stats?.total_incorrect || 0) + incorrectAnswers;
      const newBestStreak = Math.max(stats?.best_streak || 0, maxStreak);
      
      if (stats) {
        await supabase
          .from('trivia_user_stats')
          .update({
            total_points: newTotalPoints,
            total_matches: newTotalMatches,
            total_correct: newTotalCorrect,
            total_incorrect: newTotalIncorrect,
            best_streak: newBestStreak,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user!.id);
      } else {
        await supabase
          .from('trivia_user_stats')
          .insert({
            user_id: user!.id,
            total_points: victoryPoints,
            total_matches: 1,
            total_correct: correctAnswers,
            total_incorrect: incorrectAnswers,
            best_streak: maxStreak
          });
      }
      
      toast({
        title: "🏆 ¡Victoria!",
        description: `Has ganado ${victoryPoints} puntos`,
        duration: 5000,
      });
    }
    
    setPhase('finished');
    
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.5 }
    });
  };

  const handleLoss = async () => {
    // Update user stats for loss - NO POINTS FOR LOSING
    if (currentPlayer) {
      const { data: stats } = await supabase
        .from('trivia_user_stats')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      
      const newTotalMatches = (stats?.total_matches || 0) + 1;
      const newTotalCorrect = (stats?.total_correct || 0) + correctAnswers;
      const newTotalIncorrect = (stats?.total_incorrect || 0) + incorrectAnswers;
      const newBestStreak = Math.max(stats?.best_streak || 0, maxStreak);
      
      if (stats) {
        await supabase
          .from('trivia_user_stats')
          .update({
            total_matches: newTotalMatches,
            total_correct: newTotalCorrect,
            total_incorrect: newTotalIncorrect,
            best_streak: newBestStreak,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user!.id);
      } else {
        await supabase
          .from('trivia_user_stats')
          .insert({
            user_id: user!.id,
            total_matches: 1,
            total_correct: correctAnswers,
            total_incorrect: incorrectAnswers,
            best_streak: maxStreak
          });
      }
    }
    
    setPhase('finished');
  };

  if (!match || !players || !categories) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl animate-bounce">🎮</div>
          <p className="text-xl font-semibold">Cargando partida...</p>
        </div>
      </div>
    );
  }

  // Waiting for match to start - show waiting screen
  if (match.status === 'waiting' || !match.current_player_id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 pb-6 text-center space-y-4">
            <div className="text-5xl animate-pulse">⏳</div>
            <div>
              <h2 className="text-xl font-bold">Esperando al oponente</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {waitingForOpponent
                  ? "Esperando a que el otro jugador se una..."
                  : "Preparando la partida..."}
              </p>
            </div>
            <div className="flex justify-center gap-6">
              {players?.map((player) => (
                <div key={player.id} className="flex flex-col items-center gap-2">
                  <Avatar className="w-14 h-14 border-4 border-primary">
                    <AvatarImage src={player.profiles?.avatar_url || undefined} />
                    <AvatarFallback>{player.profiles?.username?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <p className="text-xs font-medium truncate max-w-[80px]">{player.profiles?.username || 'Jugador'}</p>
                </div>
              ))}
            </div>
            <Button onClick={() => navigate('/trivia-game')} variant="outline" size="sm" className="w-full">
              Volver al menú
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
          className="w-full max-w-sm"
        >
          <Card className="text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="text-7xl">{isWinner ? "🏆" : "😔"}</div>
              <h2 className="text-3xl font-bold">
                {isWinner ? "¡Victoria!" : "Derrota"}
              </h2>
              <p className="text-muted-foreground text-sm px-4">
                {isWinner
                  ? "¡Completaste todos los personajes!"
                  : `${winner?.profiles?.username} completó todos los personajes`}
              </p>
              <Button className="w-full" size="lg" onClick={() => window.location.reload()}>
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
    <div className="px-4 pt-3 pb-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const confirmExit = window.confirm('¿Estás seguro de que quieres salir de la partida?');
          if (confirmExit) {
            window.location.href = '/trivia-game';
          }
        }}
        className="text-muted-foreground hover:text-foreground h-8"
      >
        <LogOut className="w-3.5 h-3.5 mr-1.5" />
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
          <div className="px-4 pb-3">
            <Card>
              <CardContent className="py-4 text-center">
                <h3 className="text-base font-semibold text-muted-foreground">
                  Turno de <span className="text-foreground">{opponent.profiles?.username}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
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
      <div className="min-h-screen">
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
      <div className="min-h-screen space-y-3">
        <ExitButton />
        <PlayerStats 
          currentPlayer={currentPlayer!} 
          opponent={opponent!} 
          categories={categories}
        />

        <StreakIndicator streak={currentStreak} />

        <div className="px-3 pb-4">
          <Card className="max-w-3xl mx-auto">
            <CardContent className="p-4 space-y-4">
              {/* Category and timer */}
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary" className="text-sm px-3 py-1 shrink-0">
                  {currentCategory?.icon} {currentCategory?.name}
                </Badge>
                <div className={`flex items-center gap-1.5 font-bold shrink-0 ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : ''}`}>
                  <Clock className="w-4 h-4" />
                  <span className="text-xl tabular-nums">{timeLeft}s</span>
                </div>
              </div>

              {/* Question */}
              <h3 className="text-base md:text-xl font-bold text-center leading-snug">
                {currentQuestion.question_text}
              </h3>

              {currentQuestion.image_url && (
                <img
                  src={currentQuestion.image_url}
                  alt="Question"
                  className="w-full max-w-xs mx-auto rounded-lg"
                />
              )}

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.options?.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const showCorrect = showFeedback && option.is_correct;
                  const showIncorrect = showFeedback && isSelected && !option.is_correct;
                  
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => handleAnswer(index)}
                      disabled={!isMyTurn || selectedAnswer !== null}
                      className={`h-auto py-3 px-4 text-sm md:text-base whitespace-normal font-semibold min-h-[56px] ${
                        showCorrect ? '!bg-green-500 !text-white !border-green-600' : 
                        showIncorrect ? '!bg-red-500 !text-white !border-red-600' : 
                        'bg-card text-foreground border-2'
                      }`}
                    >
                      <span className="block w-full text-center leading-snug">
                        {option.option_text}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Waiting for turn or opponent
  return (
    <div className="min-h-screen">
      <ExitButton />
      {currentPlayer && opponent && (
        <PlayerStats 
          currentPlayer={currentPlayer} 
          opponent={opponent} 
          categories={categories}
        />
      )}
      <div className="flex items-center justify-center p-4 pt-2">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 pb-6 text-center space-y-3">
            <div className="text-5xl">
              {waitingForOpponent ? "🔍" : "⏳"}
            </div>
            <h2 className="text-xl font-bold">
              {waitingForOpponent 
                ? "Buscando oponente..." 
                : `Turno de ${opponent?.profiles?.username}`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {waitingForOpponent 
                ? "Otro jugador se unirá pronto" 
                : "Espera tu turno..."}
            </p>
            <Button 
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                const confirmExit = window.confirm('¿Estás seguro de que quieres salir de la partida?');
                if (confirmExit) {
                  window.location.href = '/trivia-game';
                }
              }}
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Salir de la partida
            </Button>
          </CardContent>
        </Card>
      </div>
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
    <div className="px-3 pb-2">
      <div className="grid grid-cols-2 gap-2">
        {/* Current Player */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarImage src={currentPlayer.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {currentPlayer.profiles?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-xs truncate">{currentPlayer.profiles?.username}</p>
                <p className="text-[10px] text-muted-foreground">Tú</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-0.5">
              {categories?.map(cat => (
                <span
                  key={cat.id}
                  className={`text-lg leading-none ${
                    currentPlayer.characters_collected.includes(cat.id)
                      ? 'opacity-100'
                      : 'opacity-20 grayscale'
                  }`}
                  title={cat.name}
                >
                  {cat.icon}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Opponent */}
        <Card className="bg-secondary/5 border-secondary/20">
          <CardContent className="p-3">
            {opponent ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarImage src={opponent.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {opponent.profiles?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs truncate">{opponent.profiles?.username}</p>
                    <p className="text-[10px] text-muted-foreground">Oponente</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-0.5">
                  {categories?.map(cat => (
                    <span
                      key={cat.id}
                      className={`text-lg leading-none ${
                        opponent.characters_collected.includes(cat.id)
                          ? 'opacity-100'
                          : 'opacity-20 grayscale'
                      }`}
                      title={cat.name}
                    >
                      {cat.icon}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[60px]">
                <p className="text-xs text-muted-foreground text-center">
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
