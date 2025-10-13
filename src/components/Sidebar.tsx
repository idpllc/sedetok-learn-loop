import { Home, Search, Map, Award, User, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AuthModal } from "./AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./ui/button";
import sedefyLogo from "@/assets/sedefy-logo.png";

export const Sidebar = () => {
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

  const menuItems = [
    { id: "home", icon: Home, label: "Inicio", path: "/" },
    { id: "search", icon: Search, label: "Explorar", path: "/search" },
    { id: "routes", icon: Map, label: "Rutas", path: "/learning-paths" },
    { id: "achievements", icon: Award, label: "Logros", path: "/achievements" },
    { id: "profile", icon: User, label: "Perfil", path: "/profile" },
  ];

  return (
    <>
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex-col z-50">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <img src={sedefyLogo} alt="Sedefy" className="h-8 w-auto" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-primary text-primary-foreground font-medium' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-base">{item.label}</span>
              </button>
            );
          })}

          {/* Create Button - Destacado */}
          <Button
            onClick={handleCreateClick}
            className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-6"
            size="lg"
          >
            <Plus className="w-6 h-6 mr-2" />
            Crear
          </Button>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <nav className="space-y-2 text-xs text-muted-foreground">
            <button
              onClick={() => navigate("/about")}
              className="block hover:text-foreground transition-colors"
            >
              Sobre Sedefy
            </button>
            <button
              onClick={() => navigate("/creator-program")}
              className="block hover:text-foreground transition-colors"
            >
              Programa de creadores
            </button>
            <button
              onClick={() => navigate("/terms")}
              className="block hover:text-foreground transition-colors"
            >
              Términos y condiciones
            </button>
            <button
              onClick={() => navigate("/privacy")}
              className="block hover:text-foreground transition-colors"
            >
              Política de privacidad
            </button>
          </nav>
          <p className="mt-4 text-xs text-muted-foreground">© 2025 Sedefy</p>
        </div>
      </aside>

      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen}
        onSuccess={() => navigate("/create")}
      />
    </>
  );
};
