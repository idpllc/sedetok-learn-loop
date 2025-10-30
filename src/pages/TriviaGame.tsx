import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useTriviaGame, TriviaCategory, TriviaQuestion } from "@/hooks/useTriviaGame";
import { TriviaWheel } from "@/components/trivia/TriviaWheel";
import { TriviaGameplay } from "@/components/trivia/TriviaGameplay";
import { TriviaRanking } from "@/components/trivia/TriviaRanking";
import { TriviaAdminPanel } from "@/components/trivia/TriviaAdminPanel";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Loader2, Trophy, User, Play, Crown, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type GameScreen = "menu" | "wheel" | "gameplay" | "results" | "ranking" | "admin";

export default function TriviaGame() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const [screen, setScreen] = useState<GameScreen>("menu");
  const [selectedCategory, setSelectedCategory] = useState<TriviaCategory | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>("libre");
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [gameResult, setGameResult] = useState<any>(null);

  const levels = [
    { value: "preescolar", label: "🎨 Preescolar", description: "Preguntas básicas y divertidas" },
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
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 p-4">
        <div className="container max-w-4xl mx-auto py-8 space-y-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-4"
          >
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              🎯 Trivia Challenge
            </h1>
            <p className="text-xl text-muted-foreground">
              ¡Pon a prueba tus conocimientos!
            </p>
          </motion.div>

          {/* Level Selection */}
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="text-center">
                <h3 className="text-2xl font-bold">Selecciona tu Nivel</h3>
                <p className="text-muted-foreground">Elige el nivel de dificultad de las preguntas</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {levels.map((level) => (
                  <Button
                    key={level.value}
                    variant={selectedLevel === level.value ? "default" : "outline"}
                    className="h-auto py-4 px-3 flex flex-col gap-1.5 text-center"
                    onClick={() => setSelectedLevel(level.value)}
                  >
                    <span className="text-3xl">{level.label.split(" ")[0]}</span>
                    <span className="text-xs font-semibold leading-tight">{level.label.split(" ").slice(1).join(" ")}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{level.description}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* User Stats Card */}
          {userStats && (
            <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-primary">{userStats.total_points}</div>
                    <div className="text-sm text-muted-foreground">Puntos Totales</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-600">{userStats.total_correct}</div>
                    <div className="text-sm text-muted-foreground">Correctas</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-orange-600">{userStats.best_streak}</div>
                    <div className="text-sm text-muted-foreground">Mejor Racha</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-secondary">{userStats.total_matches}</div>
                    <div className="text-sm text-muted-foreground">Partidas</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="grid gap-4 md:grid-cols-2">
            <Button
              size="lg"
              onClick={handleStartGame}
              className="h-32 text-2xl font-bold"
            >
              <Play className="w-8 h-8 mr-2" />
              Jugar Ahora
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => setScreen("ranking")}
              className="h-32 text-2xl font-bold"
            >
              <Trophy className="w-8 h-8 mr-2" />
              Ver Ranking
            </Button>
          </div>

          {isSuperAdmin && (
            <Button
              variant="secondary"
              onClick={() => setScreen("admin")}
              className="w-full h-16 text-lg font-bold"
            >
              <Crown className="w-6 h-6 mr-2" />
              Panel de Administración
            </Button>
          )}
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
