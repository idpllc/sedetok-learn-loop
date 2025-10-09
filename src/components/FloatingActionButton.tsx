import { Plus, Video, BookOpen, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "./ui/button";
import { AuthModal } from "./AuthModal";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const FloatingActionButton = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleNavigation = (path: string) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    navigate(path);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-20 right-6 z-40 w-14 h-14 rounded-full shadow-[var(--shadow-float)] bg-primary hover:bg-primary/90"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 mb-2">
          <DropdownMenuItem onClick={() => handleNavigation("/create")}>
            <Video className="mr-2 h-4 w-4" />
            Crear Cápsula
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleNavigation("/create-quiz")}>
            <HelpCircle className="mr-2 h-4 w-4" />
            Crear Quiz
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen}
        onSuccess={() => navigate("/create")}
      />
    </>
  );
};
