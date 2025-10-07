import { Plus } from "lucide-react";
import { Button } from "./ui/button";

export const FloatingActionButton = () => {
  return (
    <Button
      size="lg"
      className="fixed bottom-20 right-6 z-40 w-14 h-14 rounded-full shadow-[var(--shadow-float)] bg-primary hover:bg-primary/90 animate-pulse-glow"
    >
      <Plus className="w-6 h-6" />
    </Button>
  );
};
