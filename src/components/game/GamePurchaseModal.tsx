import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, Clock, Coins, Zap } from "lucide-react";
import { useEducoins } from "@/hooks/useEducoins";
import { useXP } from "@/hooks/useXP";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface GamePurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "lives" | "time";
  onPurchase: (amount: number) => void;
}

const LIFE_COST_EDUCOINS = 3;
const LIFE_COST_XP = 3000;
const TIME_COST_EDUCOINS = 1; // per minute
const TIME_COST_XP = 1000; // per minute

export const GamePurchaseModal = ({ open, onOpenChange, type, onPurchase }: GamePurchaseModalProps) => {
  const { user } = useAuth();
  const { balance, deductEducoins } = useEducoins();
  const { deductXP } = useXP();
  const [quantity, setQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [userXP, setUserXP] = useState<number | null>(null);

  // Fetch XP on open
  useState(() => {
    if (open && user) {
      supabase
        .from("profiles")
        .select("experience_points")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          setUserXP(data?.experience_points || 0);
        });
    }
  });

  const isLives = type === "lives";
  const educoinsPerUnit = isLives ? LIFE_COST_EDUCOINS : TIME_COST_EDUCOINS;
  const xpPerUnit = isLives ? LIFE_COST_XP : TIME_COST_XP;
  const totalEducoins = educoinsPerUnit * quantity;
  const totalXP = xpPerUnit * quantity;
  const unitLabel = isLives ? (quantity === 1 ? "vida" : "vidas") : (quantity === 1 ? "minuto" : "minutos");

  const handlePurchaseWithEducoins = async () => {
    if (!user) return;
    setPurchasing(true);
    try {
      const success = await deductEducoins(totalEducoins, `Compra de ${quantity} ${unitLabel} en juego`, false);
      if (success) {
        onPurchase(quantity);
        onOpenChange(false);
        toast.success(`+${quantity} ${unitLabel}`, {
          description: `Pagado con ${totalEducoins} Educoins`,
          duration: 2000,
        });
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handlePurchaseWithXP = async () => {
    if (!user) return;
    setPurchasing(true);
    try {
      const success = await deductXP(totalXP, isLives ? "buy_lives" : "buy_time");
      if (success) {
        onPurchase(quantity);
        onOpenChange(false);
        setUserXP((prev) => (prev !== null ? prev - totalXP : null));
        toast.success(`+${quantity} ${unitLabel}`, {
          description: `Pagado con ${totalXP} XP`,
          duration: 2000,
        });
      }
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLives ? (
              <>
                <Heart className="w-5 h-5 text-red-500" />
                Comprar Vidas
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 text-blue-500" />
                Comprar Tiempo Extra
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quantity selector */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              -
            </Button>
            <div className="text-center min-w-[80px]">
              <span className="text-3xl font-bold">{quantity}</span>
              <p className="text-xs text-muted-foreground">{unitLabel}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.min(5, quantity + 1))}
              disabled={quantity >= 5}
            >
              +
            </Button>
          </div>

          {/* Price summary */}
          <div className="grid grid-cols-2 gap-3">
            {/* Educoins option */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Coins className="w-4 h-4 text-yellow-500" />
                Educoins
              </div>
              <p className="text-2xl font-bold">{totalEducoins}</p>
              <p className="text-xs text-muted-foreground">
                Saldo: {balance ?? 0}
              </p>
              <Button
                className="w-full"
                size="sm"
                onClick={handlePurchaseWithEducoins}
                disabled={purchasing || (balance ?? 0) < totalEducoins}
              >
                <Coins className="w-3.5 h-3.5 mr-1" />
                Pagar con Educoins
              </Button>
            </div>

            {/* XP option */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Zap className="w-4 h-4 text-primary" />
                Puntos XP
              </div>
              <p className="text-2xl font-bold">{totalXP.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                Saldo: {userXP !== null ? userXP.toLocaleString() : "..."}
              </p>
              <Button
                className="w-full"
                variant="secondary"
                size="sm"
                onClick={handlePurchaseWithXP}
                disabled={purchasing || (userXP !== null && userXP < totalXP)}
              >
                <Zap className="w-3.5 h-3.5 mr-1" />
                Pagar con XP
              </Button>
            </div>
          </div>

          {/* Pricing info */}
          <p className="text-xs text-center text-muted-foreground">
            {isLives
              ? `Cada vida cuesta ${LIFE_COST_EDUCOINS} Educoins ó ${LIFE_COST_XP.toLocaleString()} XP`
              : `Cada minuto cuesta ${TIME_COST_EDUCOINS} Educoin ó ${TIME_COST_XP.toLocaleString()} XP`}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
