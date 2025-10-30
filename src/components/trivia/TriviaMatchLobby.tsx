import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTriviaMatch } from "@/hooks/useTriviaMatch";
import { Loader2, Copy, Users } from "lucide-react";
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
      
      // Poll for second player
      const checkInterval = setInterval(async () => {
        // This will be handled by realtime subscription
      }, 2000);

      // Store interval to clear later
      (window as any).matchCheckInterval = checkInterval;
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
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md mx-auto"
      >
        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              Esperando Oponente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground mb-4">
                Comparte este código con tu oponente
              </p>
              
              <div className="flex items-center gap-2 justify-center">
                <div className="text-4xl font-bold tracking-wider bg-background/50 px-6 py-3 rounded-lg">
                  {createdMatch.match_code}
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyMatchCode}
                >
                  <Copy className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>1/2 jugadores</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="max-w-md mx-auto space-y-6"
    >
      {/* Active matches */}
      <ActiveMatches onMatchSelect={onMatchStart} />

      <Card>
        <CardHeader>
          <CardTitle className="text-center">Jugar Aleatorio</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            size="lg"
            className="w-full"
            onClick={handleJoinRandom}
            disabled={joinRandomMatch.isPending || searchingRandom}
          >
            {joinRandomMatch.isPending || searchingRandom ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Buscando oponente...
              </>
            ) : (
              <>
                <Users className="w-5 h-5 mr-2" />
                Buscar Oponente
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            O
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center">Crear Partida Privada</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={handleCreateMatch}
            disabled={createMatch.isPending}
          >
            {createMatch.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear con Código"
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            O
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center">Unirse a Partida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Código de partida"
            value={matchCode}
            onChange={(e) => setMatchCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="text-center text-lg tracking-wider"
          />
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={handleJoinMatch}
            disabled={joinMatch.isPending || !matchCode.trim()}
          >
            {joinMatch.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uniéndose...
              </>
            ) : (
              "Unirse"
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
