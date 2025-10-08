import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

export const FloatingActionButton = () => {
  const navigate = useNavigate();

  return (
    <Button
      size="lg"
      onClick={() => navigate("/create")}
      className="fixed bottom-20 right-6 z-40 w-14 h-14 rounded-full shadow-[var(--shadow-float)] bg-primary hover:bg-primary/90 animate-pulse-glow"
    >
      <Plus className="w-6 h-6" />
    </Button>
  );
};
