import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTriviaMatch } from "@/hooks/useTriviaMatch";
import { Loader2, Copy, Users, Shuffle, Lock, LogIn } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ActiveMatches } from "./ActiveMatches";

interface TriviaMatchLobbyProps {
  onMatchStart: (matchId: string) => void;
  selectedLevel: string;
}

export function TriviaMatchLobby({ onMatchStart, selectedLevel }: TriviaMatchLobbyProps) {
  const [matchCode, setMatchCode] = useState("");
  const [createdMatch, setCreatedMatch] = useState<any>(null);
  const [searchingRandom, setSearchingRandom] = useState(false);
  const { createMatch, joinMatch, joinRandomMatch } = useTriviaMatch();

  const handleCreateMatch = async () => {
    try {
      const match = await createMatch.mutateAsync(selectedLevel);
      setCreatedMatch(match);
      toast.success("¡Partida creada! Comparte el código con tu oponente");
    } catch (error: any) {
      toast.error(error.message || "Error al crear la partida");
    }
  };

  const handleJoinMatch = async () => {
    if (!matchCode.trim()) {
      toast.error("Ingresa un código de partida");
      return;
    }
    try {
      const match = await joinMatch.mutateAsync(matchCode.toUpperCase());
      toast.success("¡Te uniste a la partida!");
      onMatchStart(match.id);
    } catch (error: any) {
      toast.error(error.message || "Error al unirse a la partida");
    }
  };

  const handleJoinRandom = async () => {
    setSearchingRandom(true);
    try {
      const match = await joinRandomMatch.mutateAsync(selectedLevel);
      toast.success("¡Comenzando partida!");
      onMatchStart(match.id);
    } catch (error: any) {
      toast.error(error.message || "Error al buscar partida");
      setSearchingRandom(false);
    }
  };

  const copyMatchCode = () => {
    if (createdMatch) {
      navigator.clipboard.writeText(createdMatch.match_code);
      toast.success("Código copiado al portapapeles");
    }
  };

  if (createdMatch) {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-sm mx-auto"
      >
        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
          <CardContent className="pt-6 pb-6 space-y-5 text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
            <div>
              <h2 className="text-xl font-bold mb-1">Esperando Oponente</h2>
              <p className="text-sm text-muted-foreground">
                Comparte este código con tu rival
              </p>
            </div>

            <div className="flex items-center gap-2 justify-center">
              <div className="text-3xl font-bold tracking-widest bg-background/80 px-5 py-3 rounded-xl border-2 border-primary/30 font-mono">
                {createdMatch.match_code}
              </div>
              <Button size="icon" variant="outline" onClick={copyMatchCode} className="shrink-0">
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>1/2 jugadores conectados</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="max-w-md mx-auto space-y-4"
    >
      {/* Active matches */}
      <ActiveMatches onMatchSelect={onMatchStart} />

      {/* Action cards — stacked compact */}
      <div className="grid grid-cols-1 gap-3">
        {/* Random */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Shuffle className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Partida Aleatoria</p>
                <p className="text-xs text-muted-foreground">Encuentra un oponente al azar</p>
              </div>
              <Button
                size="sm"
                onClick={handleJoinRandom}
                disabled={joinRandomMatch.isPending || searchingRandom}
                className="shrink-0"
              >
                {joinRandomMatch.isPending || searchingRandom ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Jugar"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create private */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Partida Privada</p>
                <p className="text-xs text-muted-foreground">Crea con código para invitar</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreateMatch}
                disabled={createMatch.isPending}
                className="shrink-0"
              >
                {createMatch.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Crear"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Join by code */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/30 flex items-center justify-center shrink-0">
                <LogIn className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Unirse con Código</p>
                <p className="text-xs text-muted-foreground">Ingresa el código de tu oponente</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="XXXXXX"
                value={matchCode}
                onChange={(e) => setMatchCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-base tracking-widest font-mono font-bold uppercase"
              />
              <Button
                onClick={handleJoinMatch}
                disabled={joinMatch.isPending || !matchCode.trim()}
                className="shrink-0"
              >
                {joinMatch.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Entrar"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
