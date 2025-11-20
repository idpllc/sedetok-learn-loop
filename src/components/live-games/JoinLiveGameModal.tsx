import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useJoinLiveGame } from "@/hooks/useLiveGames";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface JoinLiveGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JoinLiveGameModal = ({ open, onOpenChange }: JoinLiveGameModalProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinGame } = useJoinLiveGame();
  const [pin, setPin] = useState("");
  const [playerName, setPlayerName] = useState("");

  const handleJoin = () => {
    if (!pin || !playerName) return;

    joinGame.mutate(
      { pin, playerName },
      {
        onSuccess: ({ game, player }) => {
          onOpenChange(false);
          navigate(`/live-games/play/${game.id}?playerId=${player.id}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Unirse a un Juego</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="pin">Código PIN</Label>
            <Input
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value.toUpperCase())}
              placeholder="Ingresa el código de 6 dígitos"
              maxLength={6}
              className="text-center text-2xl font-mono"
            />
          </div>

          <div>
            <Label htmlFor="playerName">Tu Nombre</Label>
            <Input
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="¿Cómo te llamas?"
            />
          </div>

          <Button
            onClick={handleJoin}
            disabled={!pin || !playerName || joinGame.isPending}
            className="w-full"
          >
            {joinGame.isPending ? "Uniéndose..." : "Unirse al Juego"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinLiveGameModal;