import { Home, Search, Award, User, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AuthModal } from "./AuthModal";
import { useAuth } from "@/hooks/useAuth";

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [videoProgress, setVideoProgress] = useState<{ progress: number; currentTime: number; duration: number }>({
    progress: 0,
    currentTime: 0,
    duration: 0,
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ progress: number; currentTime: number; duration: number }>;
      if (ce.detail && typeof ce.detail.progress === 'number') {
        setVideoProgress(ce.detail);
      }
    };
    window.addEventListener('video-progress', handler as EventListener);
    return () => window.removeEventListener('video-progress', handler as EventListener);
  }, []);

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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border relative">
        {/* Top progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-foreground/20">
          <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, videoProgress.progress))}%` }} />
        </div>
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
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 transition-all text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs font-medium">Crear</span>
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