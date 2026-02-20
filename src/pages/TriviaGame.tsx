import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useTriviaGame, TriviaCategory, TriviaQuestion } from "@/hooks/useTriviaGame";
import { TriviaWheel } from "@/components/trivia/TriviaWheel";
import { TriviaGameplay } from "@/components/trivia/TriviaGameplay";
import { TriviaRanking } from "@/components/trivia/TriviaRanking";
import { TriviaAdminPanel } from "@/components/trivia/TriviaAdminPanel";
import { TriviaMatchLobby } from "@/components/trivia/TriviaMatchLobby";
import { TriviaMatch1v1 } from "@/components/trivia/TriviaMatch1v1";
import { ChallengeFriendsModal } from "@/components/trivia/ChallengeFriendsModal";
import { InvitationsPanel } from "@/components/trivia/InvitationsPanel";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Loader2, Trophy, User, Play, Crown, ArrowLeft, Users, Swords } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type GameScreen = "menu" | "wheel" | "gameplay" | "results" | "ranking" | "admin" | "lobby-1v1" | "match-1v1";

export default function TriviaGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const [screen, setScreen] = useState<GameScreen>("menu");
  const [selectedCategory, setSelectedCategory] = useState<TriviaCategory | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>("libre");
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [gameResult, setGameResult] = useState<any>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  // Check if coming from a notification with match parameter
  useEffect(() => {
    const matchParam = searchParams.get('match');
    if (matchParam && user) {
      setMatchId(matchParam);
      setScreen('match-1v1');
    }
  }, [searchParams, user]);

  const levels = [
    { value: "primaria", label: "📚 Primaria", description: "Conocimientos elementales" },
    { value: "secundaria", label: "🎓 Secundaria", description: "Retos para estudiantes" },
    { value: "universidad", label: "🏛️ Universidad", description: "Desafíos avanzados" },
    { value: "libre", label: "🌟 Libre", description: "Todos los niveles" },
  ];
  
  const { categories, loadingCategories, userStats, loadingStats, fetchQuestionsByCategory, saveMatch } = useTriviaGame();

  const handleStartGame = () => {
    setScreen("wheel");
  };

  const handleCategorySelected = async (category: TriviaCategory) => {
    setSelectedCategory(category);
    try {
      const qs = await fetchQuestionsByCategory(category.id, selectedLevel);
      if (qs.length === 0) {
        alert("No hay preguntas disponibles en esta categoría para este nivel");
        setScreen("menu");
        return;
      }
      setQuestions(qs);
      setTimeout(() => {
        setScreen("gameplay");
      }, 1500);
    } catch (error) {
      console.error("Error fetching questions:", error);
      setScreen("menu");
    }
  };

  const handleGameEnd = async (result: any) => {
    setGameResult(result);
    await saveMatch.mutateAsync(result);
    
    // Big celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 250);
    
    setScreen("results");
  };

  const handlePlayAgain = () => {
    setSelectedCategory(null);
    setQuestions([]);
    setGameResult(null);
    setScreen("menu");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <h2 className="text-2xl font-bold">Inicia sesión para jugar</h2>
            <p className="text-muted-foreground">
              Necesitas una cuenta para jugar y guardar tu progreso
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingCategories || loadingStats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin" />
      </div>
    );
  }

  // Menu Screen
  if (screen === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20">
        <div className="container max-w-4xl mx-auto px-4 pt-3 pb-6 space-y-3">

          {/* Header compacto */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="shrink-0 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Volver
            </Button>
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-tight"
            >
              🎯 Trivia Challenge
            </motion.h1>
          </div>

          {/* Stats inline (si existen) */}
          {userStats && (
            <div className="grid grid-cols-4 gap-2 bg-card/60 backdrop-blur rounded-xl px-3 py-2 border border-border/40">
              <div className="text-center">
                <div className="text-lg font-bold text-primary leading-none">{userStats.total_points}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Puntos</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600 leading-none">{userStats.total_correct}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Correctas</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-500 leading-none">{userStats.best_streak}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Racha</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-secondary leading-none">{userStats.total_matches}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Partidas</div>
              </div>
            </div>
          )}

          {/* Level Selection compacto */}
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-3 pb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Nivel de dificultad</p>
              <div className="grid grid-cols-4 gap-2">
                {levels.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setSelectedLevel(level.value)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 transition-all text-center
                      ${selectedLevel === level.value
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/50 bg-background/60 hover:border-primary/40"}`}
                  >
                    <span className="text-xl">{level.label.split(" ")[0]}</span>
                    <span className="text-[10px] font-semibold leading-tight text-foreground">{level.label.split(" ").slice(1).join(" ")}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons — más compactos en móvil */}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <Button
              size="lg"
              onClick={handleStartGame}
              className="h-14 md:h-24 text-lg md:text-xl font-bold"
            >
              <Play className="w-5 h-5 mr-2" />
              Jugar Solo
            </Button>

            <Button
              size="lg"
              variant="secondary"
              onClick={() => setScreen("lobby-1v1")}
              className="h-14 md:h-24 text-lg md:text-xl font-bold"
            >
              <Users className="w-5 h-5 mr-2" />
              Jugar 1 vs 1
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowChallengeModal(true)}
              className="h-14 md:h-24 text-lg md:text-xl font-bold border-2 border-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Swords className="w-5 h-5 mr-2" />
              Retar Amigos
            </Button>
          </div>

          {/* Fila inferior: Ranking + Admin */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setScreen("ranking")}
              className="flex-1 h-11 text-sm font-semibold"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Ver Ranking
            </Button>
            {isSuperAdmin && (
              <Button
                variant="secondary"
                onClick={() => setScreen("admin")}
                className="flex-1 h-11 text-sm font-semibold"
              >
                <Crown className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
          </div>

          {/* Invitations Panel — colapsado/compacto */}
          <InvitationsPanel />

          {/* Challenge Modal */}
          <ChallengeFriendsModal 
            open={showChallengeModal}
            onOpenChange={setShowChallengeModal}
          />
        </div>
      </div>
    );
  }

  // Wheel Screen
  if (screen === "wheel") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20">
        <TriviaWheel
          categories={categories || []}
          onCategorySelected={handleCategorySelected}
        />
      </div>
    );
  }

  // Gameplay Screen
  if (screen === "gameplay" && selectedCategory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-4">
        <TriviaGameplay
          questions={questions}
          category={selectedCategory}
          onGameEnd={handleGameEnd}
        />
      </div>
    );
  }

  // Results Screen
  if (screen === "results" && gameResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="container max-w-2xl"
        >
          <Card className="text-center">
            <CardContent className="pt-8 space-y-6">
              <div className="text-6xl mb-4">
                {gameResult.points_earned >= 800 ? "🏆" : 
                 gameResult.points_earned >= 500 ? "🎉" : 
                 gameResult.points_earned >= 300 ? "👍" : "💪"}
              </div>
              
              <h2 className="text-4xl font-bold">
                {gameResult.points_earned >= 800 ? "¡Increíble!" : 
                 gameResult.points_earned >= 500 ? "¡Muy bien!" : 
                 gameResult.points_earned >= 300 ? "¡Buen trabajo!" : "¡Sigue intentando!"}
              </h2>

              <div className="text-6xl font-bold text-primary">
                {gameResult.points_earned} puntos
              </div>

              <div className="grid grid-cols-3 gap-4 py-6">
                <div>
                  <div className="text-3xl font-bold text-green-600">{gameResult.correct_answers}</div>
                  <div className="text-sm text-muted-foreground">Correctas</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-red-600">{gameResult.incorrect_answers}</div>
                  <div className="text-sm text-muted-foreground">Incorrectas</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-orange-600">{gameResult.best_streak}</div>
                  <div className="text-sm text-muted-foreground">Mejor Racha</div>
                </div>
              </div>

              <div className="space-y-2">
                <Button size="lg" onClick={handlePlayAgain} className="w-full">
                  <Play className="w-5 h-5 mr-2" />
                  Jugar de Nuevo
                </Button>
                <Button size="lg" variant="outline" onClick={() => setScreen("ranking")} className="w-full">
                  <Trophy className="w-5 h-5 mr-2" />
                  Ver Ranking
                </Button>
                <Button variant="ghost" onClick={() => setScreen("menu")}>
                  Menú Principal
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Ranking Screen
  if (screen === "ranking") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
        <div className="container max-w-4xl mx-auto py-8 space-y-6">
          <Button variant="ghost" onClick={() => setScreen("menu")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Menú
          </Button>
          <TriviaRanking />
        </div>
      </div>
    );
  }

  // 1v1 Lobby
  if (screen === "lobby-1v1") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
        <div className="container max-w-4xl mx-auto py-8 space-y-6">
          <Button variant="ghost" onClick={() => setScreen("menu")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Menú
          </Button>
          
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-4xl font-bold">Modo 1 vs 1</h1>
            <p className="text-muted-foreground">
              Compite contra otro jugador y colecciona todos los personajes
            </p>
          </div>

          <TriviaMatchLobby
            onMatchStart={(id) => {
              setMatchId(id);
              setScreen("match-1v1");
            }}
            selectedLevel={selectedLevel}
          />
        </div>
      </div>
    );
  }

  // 1v1 Match
  if (screen === "match-1v1" && matchId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10">
        <TriviaMatch1v1 matchId={matchId} />
      </div>
    );
  }

  // Admin Screen
  if (screen === "admin" && isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
        <div className="container max-w-6xl mx-auto py-8 space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setScreen("menu")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Menú
            </Button>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Crown className="w-4 h-4 mr-2" />
              Super Admin
            </Badge>
          </div>
          <TriviaAdminPanel />
        </div>
      </div>
    );
  }

  return null;
}
