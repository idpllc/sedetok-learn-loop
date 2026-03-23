import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [collapsed, setCollapsed] = useState(false);

  const handleClick = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    navigate("/create");
  };

  const handleAuthSuccess = () => {
    navigate(location.pathname + location.search);
  };

  return (
    <>
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="fixed bottom-24 -right-1 z-40 w-5 h-12 rounded-l-lg bg-primary/80 hover:bg-primary flex items-center justify-center shadow-md transition-all"
          aria-label="Mostrar botón de crear"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-primary-foreground" />
        </button>
      ) : (
        <div className="fixed bottom-20 right-4 z-40 flex items-center gap-1">
          <button
            onClick={() => setCollapsed(true)}
            className="w-5 h-5 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
            aria-label="Ocultar botón"
          >
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </button>
          <Button
            size="lg"
            onClick={handleClick}
            className="w-14 h-14 rounded-full shadow-[var(--shadow-float)] bg-primary hover:bg-primary/90"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      )}

      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
};
