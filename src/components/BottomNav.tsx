import { Home, Search, Award, User, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AuthModal } from "./AuthModal";
import { useAuth } from "@/hooks/useAuth";

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const isViewingPath = location.pathname.startsWith("/learning-paths/");
  if (isViewingPath) return null;

  const handleCreateClick = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    navigate("/create");
  };

  const leftTabs = [
    { id: "home", icon: Home, label: t("nav.home"), path: "/" },
    { id: "search", icon: Search, label: t("nav.explore"), path: "/search" },
  ];

  const rightTabs = [
    { id: "achievements", icon: Award, label: t("nav.achievements"), path: "/achievements" },
    { id: "profile", icon: User, label: t("nav.profile"), path: "/profile" },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
        <div className="flex items-center justify-around h-20 max-w-3xl mx-auto px-4">
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

          <button
            onClick={handleCreateClick}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 transition-all text-pink hover:text-pink/80"
          >
            <div className="w-10 h-10 rounded-full bg-pink flex items-center justify-center -mt-4 shadow-lg">
              <Plus className="w-5 h-5 text-pink-foreground" />
            </div>
            <span className="text-xs font-medium">{t("common.create")}</span>
          </button>

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
