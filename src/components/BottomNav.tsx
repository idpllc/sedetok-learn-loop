import { Home, Search, Award, User, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AuthModal } from "./AuthModal";
import { useAuth } from "@/hooks/useAuth";

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleCreateClick = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    navigate("/create");
  };

  const leftTabs = [
    { id: "home", icon: Home, label: "Inicio", path: "/" },
    { id: "search", icon: Search, label: "Explorar", path: "/search" },
  ];

  const rightTabs = [
    { id: "achievements", icon: Award, label: "Logros", path: "/achievements" },
    { id: "profile", icon: User, label: "Perfil", path: "/profile" },
  ];

  return (
    <>
      {/* Bottom Navigation - visible en móvil y tablet, oculto en desktop */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
        <div className="flex items-center justify-around h-20 max-w-3xl mx-auto px-4">
          {/* Left tabs */}
          {leftTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;
            
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 transition-all ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className={`w-5 h-5 transition-all ${isActive ? 'scale-110' : ''}`} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}

          {/* Create button - Center */}
          <button
            onClick={handleCreateClick}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center -mt-6 shadow-lg">
              <Plus className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xs font-medium text-foreground">Crear</span>
          </button>

          {/* Right tabs */}
          {rightTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;
            
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 transition-all ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className={`w-5 h-5 transition-all ${isActive ? 'scale-110' : ''}`} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <AuthModal
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen}
        onSuccess={() => navigate("/create")}
      />
    </>
  );
};