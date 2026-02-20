import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Users, Gamepad2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import sedefyLogo from "@/assets/sedefy-logo.png";

type Step = "name" | "joining" | "waiting";

const JoinGame = () => {
  const { pin: pinFromUrl } = useParams<{ pin?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [pin, setPin] = useState(pinFromUrl || "");
  const [playerName, setPlayerName] = useState("");
  const [step, setStep] = useState<Step>("name");
  const [gameInfo, setGameInfo] = useState<{ id: string; title: string; status: string } | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  // Auto-lookup game if PIN comes from URL
  useEffect(() => {
    if (pinFromUrl) {
      lookupGame(pinFromUrl);
    }
  }, [pinFromUrl]);

  // Poll for game start while waiting
  useEffect(() => {
    if (step !== "waiting" || !gameInfo || !playerId) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("live_games")
        .select("status")
        .eq("id", gameInfo.id)
        .single();

      if (data?.status === "in_progress") {
        clearInterval(interval);
        navigate(`/live-games/play/${gameInfo.id}?playerId=${playerId}`);
      } else if (data?.status === "finished") {
        clearInterval(interval);
        toast.error("Este juego ya finalizó");
        setStep("name");
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [step, gameInfo, playerId, navigate]);

  const lookupGame = async (gamePin: string) => {
    const { data, error } = await supabase
      .from("live_games")
      .select("id, title, status")
      .eq("pin", gamePin.trim().toUpperCase())
      .in("status", ["waiting", "in_progress"])
      .single();

    if (error || !data) {
      return null;
    }
    setGameInfo(data);
    return data;
  };

  const handleJoin = async () => {
    if (!playerName.trim()) {
      toast.error("Por favor ingresa tu nombre");
      return;
    }
    if (!pin.trim()) {
      toast.error("Por favor ingresa el código PIN");
      return;
    }

    setStep("joining");

    try {
      // Lookup game
      const game = gameInfo || await lookupGame(pin.trim().toUpperCase());
      if (!game) {
        toast.error("No se encontró ningún juego con ese PIN. Verifica el código.");
        setStep("name");
        return;
      }

      if (game.status === "finished") {
        toast.error("Este juego ya ha finalizado.");
        setStep("name");
        return;
      }

      // Join as player
      const { data: player, error: playerError } = await supabase
        .from("live_game_players")
        .insert([{
          game_id: game.id,
          player_name: playerName.trim(),
          total_score: 0,
        }])
        .select()
        .single();

      if (playerError) throw playerError;

      setPlayerId(player.id);

      if (game.status === "in_progress") {
        // Game already started, go directly
        navigate(`/live-games/play/${game.id}?playerId=${player.id}`);
      } else {
        // Wait in lobby
        setStep("waiting");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error al unirse al juego. Intenta de nuevo.");
      setStep("name");
    }
  };

  const handlePinChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 6);
    setPin(cleaned);
    if (cleaned.length === 6) {
      lookupGame(cleaned);
    } else {
      setGameInfo(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-background flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/20">
          <img src={sedefyLogo} alt="SEDETOK" className="w-10 h-10 object-contain" />
        </div>
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">SEDETOK</p>
      </div>

      <AnimatePresence mode="wait">
        {/* Step: Ingresar nombre y PIN */}
        {step === "name" && (
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            className="w-full max-w-sm"
          >
            <Card className="p-6 shadow-xl border-border/50">
              <div className="text-center mb-6">
                <Gamepad2 className="w-10 h-10 text-primary mx-auto mb-3" />
                <h1 className="text-2xl font-bold">Unirse al juego</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Ingresa el código PIN y tu nombre para participar
                </p>
              </div>

              <div className="space-y-4">
                {/* PIN */}
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Código PIN
                  </label>
                  <Input
                    value={pin}
                    onChange={(e) => handlePinChange(e.target.value)}
                    placeholder="000000"
                    className="text-center text-3xl font-mono tracking-widest h-14"
                    maxLength={6}
                    inputMode="numeric"
                    autoFocus={!pinFromUrl}
                    readOnly={!!pinFromUrl}
                  />
                  {/* Game preview */}
                  <AnimatePresence>
                    {gameInfo && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium text-primary truncate">
                          {gameInfo.title}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Nombre */}
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Tu nombre
                  </label>
                  <Input
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="¿Cómo te llamas?"
                    className="h-12 text-base"
                    maxLength={40}
                    onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
                    autoFocus={!!pinFromUrl}
                  />
                </div>

                <Button
                  onClick={handleJoin}
                  disabled={!playerName.trim() || pin.length < 6}
                  className="w-full h-12 text-base font-semibold shadow-md shadow-primary/20"
                  size="lg"
                >
                  <Users className="w-5 h-5 mr-2" />
                  ¡Entrar al juego!
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  No necesitas crear una cuenta para jugar
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step: Uniéndose */}
        {step === "joining" && (
          <motion.div
            key="joining"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center"
          >
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
            <p className="text-xl font-semibold">Uniéndote al juego...</p>
          </motion.div>
        )}

        {/* Step: Sala de espera */}
        {step === "waiting" && gameInfo && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm text-center"
          >
            <Card className="p-8 shadow-xl border-border/50">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">¡Ya estás dentro!</h2>
              <p className="text-muted-foreground mb-1">
                Esperando a que el profesor inicie...
              </p>
              <p className="text-lg font-semibold text-primary mt-3">{gameInfo.title}</p>
              <div className="mt-4 px-4 py-2 bg-muted rounded-xl inline-block">
                <p className="text-sm text-muted-foreground">Jugando como</p>
                <p className="text-base font-bold">{playerName}</p>
              </div>
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Conectado en tiempo real
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JoinGame;
