import { Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { Button } from "./ui/button";
import { AuthModal } from "./AuthModal";
import { useAuth } from "@/hooks/useAuth";

export const FloatingActionButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleClick = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    navigate("/create");
  };

  const handleAuthSuccess = () => {
    // Después del login, volver a la página donde estaba el usuario
    navigate(location.pathname + location.search);
  };

  return (
    <>
      <Button
        size="lg"
        onClick={handleClick}
        className="fixed bottom-20 right-6 z-40 w-14 h-14 rounded-full shadow-[var(--shadow-float)] bg-primary hover:bg-primary/90"
      >
        <Plus className="w-6 h-6" />
      </Button>

      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
};
