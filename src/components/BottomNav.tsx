import { Home, Search, Award, User, Plus, Menu, Map } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AuthModal } from "./AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./ui/button";

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCreateClick = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    navigate("/create");
  };

  const tabs = [
    { id: "home", icon: Home, label: "Inicio", path: "/" },
    { id: "search", icon: Search, label: "Explorar", path: "/search" },
    { id: "routes", icon: Map, label: "Rutas", path: "/learning-paths" },
    { id: "achievements", icon: Award, label: "Logros", path: "/achievements" },
    { id: "profile", icon: User, label: "Perfil", path: "/profile" },
  ];

  return (
    <>
      {/* Floating Menu Button - Bottom Right */}
      <Button
        onClick={() => setMenuOpen(!menuOpen)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-110"
        size="icon"
      >
        <Menu className="w-6 h-6" />
      </Button>

      {/* Full Menu - Slides up from bottom */}
      <nav 
        className={`fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border transition-transform duration-300 ${
          menuOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-center justify-around h-20 max-w-3xl mx-auto px-4">
          {tabs.slice(0, 2).map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  navigate(tab.path);
                  setMenuOpen(false);
                }}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 transition-all ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className={`w-5 h-5 transition-all ${isActive ? 'scale-110' : ''}`} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}

          {/* Create button */}
          <button
            onClick={() => {
              handleCreateClick();
              setMenuOpen(false);
            }}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 transition-all text-primary hover:text-primary/80"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs font-medium">Crear</span>
          </button>

          {tabs.slice(2).map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  navigate(tab.path);
                  setMenuOpen(false);
                }}
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

      {/* Backdrop */}
      {menuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 transition-opacity"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen}
        onSuccess={() => navigate("/create")}
      />
    </>
  );
};
