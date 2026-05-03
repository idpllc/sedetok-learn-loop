import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  feature: string;
  description?: string;
  requiredPlans?: ("premium" | "ultra")[];
}

export const PaywallModal = ({ open, onClose, feature, description, requiredPlans = ["premium", "ultra"] }: PaywallModalProps) => {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 w-14 h-14 rounded-full bg-[#F6339A]/10 flex items-center justify-center">
            <Lock className="w-7 h-7 text-[#F6339A]" />
          </div>
          <DialogTitle className="text-center">{feature}</DialogTitle>
          <DialogDescription className="text-center">
            {description || "Esta función está disponible en los planes Premium y Ultra."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-4">
          <Button className="bg-[#F6339A] hover:bg-[#F6339A]/90" onClick={() => { onClose(); navigate("/pricing"); }}>
            <Sparkles className="w-4 h-4 mr-2" />
            Ver planes
          </Button>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const usePaywall = () => {
  const [state, setState] = useState<{ open: boolean; feature: string; description?: string }>({ open: false, feature: "" });
  return {
    show: (feature: string, description?: string) => setState({ open: true, feature, description }),
    close: () => setState((s) => ({ ...s, open: false })),
    state,
  };
};
